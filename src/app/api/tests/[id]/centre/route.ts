import { NextResponse, after } from "next/server";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, tenantWhere } from "@/lib/api";
import { audit } from "@/lib/audit";
import { STAFF_ROLES } from "@/lib/roles";
import { generateStartCode, parseRooms, reseatSetIndex } from "@/lib/examCentre";
import { SET_LETTERS } from "@/lib/paperLayout";
import { appBaseUrl } from "@/lib/reportLinks";
import { collectCheckpoints, drainOfflineQueue } from "@/lib/offlineSubmissions";

export const maxDuration = 300;

/** "Live" = the device was heard from in the last two minutes. */
const LIVE_MS = 2 * 60_000;

async function loadTest(session: Session, id: string) {
  return prisma.test.findFirst({
    where: { id, ownerId: null, ...tenantWhere(session) },
    include: { batches: { select: { id: true } } },
    omit: { startCode: false },
  });
}

/** Students who may sit the test: the test's batches, or the whole institute. */
async function eligibleStudents(test: { organizationId: string | null; batches: { id: string }[] }) {
  return prisma.user.findMany({
    where: {
      role: "STUDENT",
      status: "APPROVED",
      organizationId: test.organizationId,
      ...(test.batches.length ? { batchId: { in: test.batches.map((b) => b.id) } } : {}),
    },
    select: { id: true, name: true, studentCode: true, batch: { select: { name: true } } },
  });
}

/**
 * Invigilator console data: start code, rooms and seat plan, and a live status per student
 * (not started / writing / idle / submitted / waiting to be graded).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;
    const { id } = await params;
    const test = await loadTest(session, id);
    if (!test) return jsonError("Test not found", 404);

    const [students, seats, attempts, sheets] = await Promise.all([
      eligibleStudents(test),
      prisma.examSeat.findMany({ where: { testId: id } }),
      prisma.attempt.findMany({
        where: { testId: id, isRetry: false },
        orderBy: { createdAt: "asc" }, // later attempts overwrite earlier ones below
        select: { id: true, userId: true, status: true, setCode: true, deviceId: true, lastSeenAt: true, offline: true, score: true, _count: { select: { violations: true } } },
      }),
      prisma.pendingSubmission.findMany({
        where: { testId: id },
        select: { userId: true, status: true, answeredCount: true, updatedAt: true, error: true },
      }),
    ]);

    const seatBy = new Map(seats.map((s) => [s.userId, s]));
    const attemptBy = new Map(attempts.map((a) => [a.userId, a]));
    const sheetBy = new Map(sheets.map((s) => [s.userId, s]));
    const now = Date.now();
    const questionCount = await prisma.testQuestion.count({ where: { testId: id } });

    const rows = students
      .map((st) => {
        const seat = seatBy.get(st.id);
        const a = attemptBy.get(st.id);
        const sh = sheetBy.get(st.id);
        let state: "NOT_STARTED" | "WRITING" | "IDLE" | "UPLOADED" | "SUBMITTED" | "FAILED" = "NOT_STARTED";
        let lastSeen: Date | null = null;
        if (a && (a.status === "COMPLETED" || a.status === "AUTO_SUBMITTED")) state = "SUBMITTED";
        else if (sh?.status === "FAILED") state = "FAILED";
        else if (sh && sh.status !== "DRAFT") state = "UPLOADED";
        else {
          lastSeen = sh?.updatedAt ?? a?.lastSeenAt ?? null;
          if (a || sh) state = lastSeen && now - lastSeen.getTime() < LIVE_MS ? "WRITING" : "IDLE";
        }
        return {
          userId: st.id,
          name: st.name,
          studentCode: st.studentCode,
          batch: st.batch?.name ?? null,
          seat: seat ? { room: seat.room, row: seat.row, col: seat.col, set: test.shuffleMode === "SETS" ? SET_LETTERS[seat.setIndex] : null, downloaded: !!seat.downloadedAt } : null,
          state,
          lastSeen,
          answered: sh?.answeredCount ?? null,
          setCode: a?.setCode ?? null,
          deviceId: a?.deviceId ?? null,
          violations: a?._count.violations ?? 0,
          score: a?.score ?? null,
          attemptId: a && state === "SUBMITTED" ? a.id : null,
          error: sh?.status === "FAILED" ? sh.error : null,
        };
      })
      .sort((x, y) => (x.studentCode ?? x.name).localeCompare(y.studentCode ?? y.name, undefined, { numeric: true }));

    const count = (s: string) => rows.filter((r) => r.state === s).length;
    return NextResponse.json({
      test: {
        id: test.id, title: test.title, duration: test.duration, scheduledStart: test.scheduledStart, scheduledEnd: test.scheduledEnd,
        shuffleMode: test.shuffleMode, setCount: test.setCount, allowOffline: test.allowOffline, startCode: test.startCode, questionCount,
      },
      rooms: parseRooms(test.centreRooms),
      students: rows,
      summary: {
        total: rows.length, seated: seats.length,
        notStarted: count("NOT_STARTED"), writing: count("WRITING"), idle: count("IDLE"),
        uploaded: count("UPLOADED"), submitted: count("SUBMITTED"), failed: count("FAILED"),
        checkpoints: sheets.filter((s) => s.status === "DRAFT").length,
        queued: sheets.filter((s) => s.status === "PENDING" || s.status === "PROCESSING").length,
      },
    });
  } catch (error) {
    console.error("[CENTRE_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/**
 * Actions. Body: { action, ... }
 * - rooms: { rooms: [{ name, rows, cols }] } saves the room layout
 * - autoSeat: seats every eligible student in student-ID order, room by room; neighbouring seats
 *   get different sets
 * - clearSeats
 * - regenerateCode: a new start code (devices must re-download an offline paper)
 * - process: grade queued offline answer sheets now
 * - collect: after the exam, submit every student's last checkpoint (dead/abandoned devices)
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;
    const { id } = await params;
    const test = await loadTest(session, id);
    if (!test) return jsonError("Test not found", 404);
    if (!test.centreExam) return jsonError("Turn on Exam Centre mode for this test first");

    const body = await request.json().catch(() => ({}));
    const log = (action: string, summary: string) =>
      audit(session, { action: `centre.${action}`, targetType: "Test", targetId: id, summary: `${summary} — "${test.title}"` }, request);

    switch (body.action) {
      case "rooms": {
        const rooms = parseRooms(JSON.stringify(body.rooms ?? []));
        if (new Set(rooms.map((r) => r.name.toLowerCase())).size !== rooms.length) return jsonError("Room names must be different");
        await prisma.test.update({ where: { id }, data: { centreRooms: JSON.stringify(rooms) } });
        // Seats in rooms that no longer exist (or outside a shrunk room) are released
        const seats = await prisma.examSeat.findMany({ where: { testId: id } });
        const stale = seats.filter((s) => {
          const r = rooms.find((x) => x.name === s.room);
          return !r || s.row >= r.rows || s.col >= r.cols;
        });
        if (stale.length) await prisma.examSeat.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
        await log("rooms", `Saved ${rooms.length} room(s)`);
        return NextResponse.json({ rooms, released: stale.length });
      }

      case "autoSeat": {
        const rooms = parseRooms(test.centreRooms);
        if (!rooms.length) return jsonError("Add at least one room first");
        const students = (await eligibleStudents(test)).sort((a, b) =>
          (a.studentCode ?? `~${a.name}`).localeCompare(b.studentCode ?? `~${b.name}`, undefined, { numeric: true })
        );
        const capacity = rooms.reduce((n, r) => n + r.rows * r.cols, 0);
        const seats: { testId: string; userId: string; room: string; row: number; col: number; setIndex: number }[] = [];
        let i = 0;
        for (const room of rooms) {
          for (let row = 0; row < room.rows; row++) {
            for (let col = 0; col < room.cols; col++) {
              if (i >= students.length) break;
              seats.push({ testId: id, userId: students[i++].id, room: room.name, row, col, setIndex: reseatSetIndex(row, col, test.setCount) });
            }
          }
        }
        await prisma.$transaction([prisma.examSeat.deleteMany({ where: { testId: id } }), prisma.examSeat.createMany({ data: seats })]);
        await log("seat", `Seated ${seats.length} of ${students.length} students`);
        return NextResponse.json({ seated: seats.length, unseated: Math.max(0, students.length - capacity) });
      }

      case "clearSeats": {
        const { count } = await prisma.examSeat.deleteMany({ where: { testId: id } });
        await log("seat_clear", `Cleared ${count} seats`);
        return NextResponse.json({ cleared: count });
      }

      case "regenerateCode": {
        const code = generateStartCode();
        await prisma.test.update({ where: { id }, data: { startCode: code } });
        await log("start_code", "Generated a new start code");
        return NextResponse.json({ startCode: code });
      }

      case "process": {
        const result = await drainOfflineQueue({ force: true, budgetMs: 240_000, baseUrl: appBaseUrl(request) });
        return NextResponse.json(result);
      }

      case "collect": {
        const collected = await collectCheckpoints(id);
        const baseUrl = appBaseUrl(request);
        after(() => drainOfflineQueue({ force: true, budgetMs: 240_000, baseUrl }).catch((e) => console.error("[CENTRE_COLLECT_DRAIN]", e)));
        await log("collect", `Collected ${collected} unsubmitted checkpoint(s)`);
        return NextResponse.json({ collected });
      }

      default:
        return jsonError("Unknown action");
    }
  } catch (error) {
    console.error("[CENTRE_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

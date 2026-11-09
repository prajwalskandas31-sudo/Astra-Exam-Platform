import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, tenantOrGlobalWhere } from "@/lib/api";
import { studentTestVisibility } from "@/lib/attempts";
import { seatLabel, signTicket, studentPaper } from "@/lib/examCentre";
import { encryptPaper, type EncryptedPaper } from "@/lib/paperCrypto";

const PAPER_TTL_MS = 10 * 60_000;
const paperCache = new Map<string, { at: number; paper: Promise<EncryptedPaper> }>();

/**
 * The paper every device downloads: questions and options only (never answers or explanations),
 * encrypted with the start code. One encryption per test version per server instance, shared
 * by every student downloading it.
 */
function encryptedPaper(test: { id: string; startCode: string; updatedAt: Date }, version: string) {
  const key = `${test.id}:${version}`;
  const hit = paperCache.get(key);
  if (hit && Date.now() - hit.at < PAPER_TTL_MS) return hit.paper;
  const paper = (async () => {
    const full = await prisma.test.findUnique({
      where: { id: test.id },
      select: {
        id: true, title: true, duration: true, mode: true, shuffleMode: true, shuffleOptions: true,
        template: { select: { examCategory: true, config: true } },
        questions: {
          orderBy: { order: "asc" },
          select: {
            questionId: true, section: true,
            question: { select: { id: true, text: true, options: true, subject: true, chapter: true, questionType: true, marks: true, negativeMarks: true } },
          },
        },
      },
    });
    if (!full) throw new Error("Test not found");
    return encryptPaper(full, test.startCode, `${test.id}:${version}`);
  })();
  paperCache.set(key, { at: Date.now(), paper });
  paper.catch(() => paperCache.delete(key));
  for (const [k, v] of paperCache) if (Date.now() - v.at >= PAPER_TTL_MS) paperCache.delete(k);
  return paper;
}

/**
 * Exam-centre lobby for one student: their seat, set and status, plus (with ?paper=1, for
 * offline-enabled tests) the encrypted paper and the signed ticket the device needs to sit the
 * exam without internet. Also returns the student's last checkpoint so they can resume on
 * another computer if theirs fails.
 */
export async function GET(request: Request, { params }: { params: Promise<{ testId: string }> }) {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;
    const { testId } = await params;
    const wantPaper = new URL(request.url).searchParams.get("paper") === "1";

    const test = await prisma.test.findFirst({
      where: { id: testId, isPublished: true, ownerId: null, ...tenantOrGlobalWhere(session), ...(await studentTestVisibility(session.user.id)) },
      include: { organization: { select: { examCentreEnabled: true, offlineExamsEnabled: true } } },
      omit: { startCode: false },
    });
    if (!test || !test.centreExam || !test.organization?.examCentreEnabled) return jsonError("This exam isn't run from an exam centre", 404);

    const offline = test.allowOffline && test.organization.offlineExamsEnabled;
    const [student, { assignment, seat }, attempt, sheet] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, studentCode: true } }),
      studentPaper(test, session.user.id),
      prisma.attempt.findFirst({
        where: { userId: session.user.id, testId, isRetry: false },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true },
      }),
      prisma.pendingSubmission.findUnique({
        where: { testId_userId: { testId, userId: session.user.id } },
        select: { status: true, attemptId: true, payload: true, updatedAt: true },
      }),
    ]);

    const version = test.startCode ? crypto.createHash("sha256").update(`${test.startCode}:${test.updatedAt.toISOString()}`).digest("hex").slice(0, 12) : null;
    let paper: { data: EncryptedPaper; ticket: string; version: string } | null = null;
    if (wantPaper && offline && test.startCode && version) {
      paper = {
        data: await encryptedPaper({ id: test.id, startCode: test.startCode, updatedAt: test.updatedAt }, version),
        ticket: signTicket({ v: 1, testId, userId: session.user.id, paperSeed: assignment?.paperSeed ?? null, setCode: assignment?.setCode ?? null, issuedAt: Date.now() }),
        version,
      };
      if (seat) await prisma.examSeat.update({ where: { id: seat.id }, data: { downloadedAt: new Date() } });
    }

    let checkpoint: unknown = null;
    if (sheet?.status === "DRAFT") {
      try {
        const p = JSON.parse(sheet.payload);
        checkpoint = { startedAt: p.startedAt, answers: p.answers, violations: p.violations ?? 0, savedAt: sheet.updatedAt };
      } catch {}
    }

    return NextResponse.json({
      test: {
        id: test.id, title: test.title, duration: test.duration, mode: test.mode,
        scheduledStart: test.scheduledStart, scheduledEnd: test.scheduledEnd, offline,
        ready: !!test.startCode,
      },
      student: { name: student?.name ?? session.user.name, studentCode: student?.studentCode ?? null },
      seat: seat ? { label: seatLabel(seat), room: seat.room, row: seat.row, col: seat.col } : null,
      setCode: assignment?.setCode ?? null,
      paperSeed: offline ? assignment?.paperSeed ?? null : null,
      attempt,
      sheet: sheet ? { status: sheet.status, attemptId: sheet.attemptId } : null,
      checkpoint,
      paperVersion: offline ? version : null,
      paper,
    });
  } catch (error) {
    console.error("[OFFLINE_LOBBY_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

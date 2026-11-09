import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantOrGlobalWhere } from "@/lib/api";
import { serverTimeRemaining, studentTestVisibility } from "@/lib/attempts";
import { startCodeMatches, studentPaper } from "@/lib/examCentre";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";

const START_CODE_TRIES = 10;

/**
 * Body: { testId, startCode?, deviceId? }.
 * Exam Centre tests need the invigilator's start code: without it the response is 403 with
 * `centre: true`, which sends the student to the exam-centre lobby.
 */
export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const body = await request.json().catch(() => null);
    const testId = body?.testId;
    if (!testId || typeof testId !== "string") {
      return NextResponse.json({ error: "Missing testId" }, { status: 400 });
    }
    const deviceId = typeof body.deviceId === "string" ? body.deviceId.slice(0, 64) : null;

    const test = await prisma.test.findFirst({
      where: { id: testId, isPublished: true, ownerId: null, ...tenantOrGlobalWhere(session), ...(await studentTestVisibility(session.user.id)) },
      include: { _count: { select: { questions: true } }, organization: { select: { examCentreEnabled: true } } },
      omit: { startCode: false },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found or not available" }, { status: 404 });
    }
    if (test._count.questions === 0) {
      return NextResponse.json({ error: "This test has no questions yet" }, { status: 400 });
    }
    const now = new Date();
    if (test.scheduledStart && test.scheduledStart > now) {
      return NextResponse.json({ error: `This test opens on ${test.scheduledStart.toLocaleString()}` }, { status: 400 });
    }
    if (test.scheduledEnd && test.scheduledEnd < now) {
      return NextResponse.json({ error: "This test window has closed" }, { status: 400 });
    }

    // Resume an unfinished attempt instead of creating duplicates (no start code needed: a
    // student whose computer crashed moves to another seat and carries on)
    const existing = await prisma.attempt.findFirst({
      where: { userId: session.user.id, testId: test.id, status: { in: ["IN_PROGRESS", "PAUSED"] }, isRetry: false },
      orderBy: { createdAt: "desc" }
    });
    if (existing && serverTimeRemaining(existing, test.duration) > 0) {
      if (deviceId && deviceId !== existing.deviceId) {
        await prisma.attempt.update({ where: { id: existing.id }, data: { deviceId } });
      }
      return NextResponse.json({ attemptId: existing.id, resumed: true });
    }

    const centre = test.centreExam && !!test.organization?.examCentreEnabled;
    if (centre) {
      if (body.startCode === undefined) {
        return NextResponse.json({ error: "This exam is run by an invigilator. Open it from the exam centre screen.", centre: true }, { status: 403 });
      }
      const tries = await rateLimit(`startcode:${session.user.id}`, START_CODE_TRIES, 15 * 60);
      if (!tries.ok) return tooManyRequests(tries.retryAfter);
      if (!test.startCode) {
        return NextResponse.json({ error: "The invigilator hasn't opened this exam yet." }, { status: 403 });
      }
      if (!startCodeMatches(test.startCode, body.startCode)) {
        return NextResponse.json({ error: "That start code isn't right. Check it with your invigilator." }, { status: 403 });
      }
    }

    const { assignment } = await studentPaper({ ...test, centreExam: centre }, session.user.id);
    const attempt = await prisma.attempt.create({
      data: {
        userId: session.user.id,
        testId: test.id,
        mode: test.mode,
        status: "IN_PROGRESS",
        timeRemaining: test.duration * 60,
        paperSeed: assignment?.paperSeed ?? null,
        setCode: assignment?.setCode ?? null,
        deviceId,
        lastSeenAt: now,
      }
    });

    return NextResponse.json({ attemptId: attempt.id, resumed: false, setCode: attempt.setCode });
  } catch (error) {
    console.error("[ATTEMPT_START_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import { acceptsAnswers, isFinished, parseIncomingAnswers, saveAnswers, serverTimeRemaining } from "@/lib/attempts";

/**
 * Autosave. The client sends only the answers that changed since its last successful save,
 * and they are written in a single statement, so this stays cheap with thousands of students
 * in the same exam.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const body = await request.json().catch(() => null);
    const timeRemaining = body?.timeRemaining;
    if (!body || typeof body.answers !== "object" || typeof timeRemaining !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      select: { userId: true, testId: true, status: true, startTime: true, timeRemaining: true, test: { select: { duration: true } } },
    });

    if (!attempt || attempt.userId !== session.user.id) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    if (isFinished(attempt.status)) {
      return NextResponse.json({ error: "Attempt already submitted" }, { status: 409 });
    }

    // The client can't extend its own clock: take the lower of client and server time
    const remaining = Math.max(0, Math.min(Math.floor(timeRemaining), serverTimeRemaining(attempt, attempt.test.duration)));
    if (!acceptsAnswers(attempt, attempt.test.duration)) {
      return NextResponse.json({ error: "Time is up", timeRemaining: 0 }, { status: 409 });
    }

    const answers = parseIncomingAnswers(body.answers);
    await Promise.all([
      saveAnswers(id, attempt.testId, answers),
      // Only the stored clock matters for resume; skip the write when it hasn't moved
      remaining < attempt.timeRemaining
        ? prisma.attempt.updateMany({ where: { id, status: { in: ["IN_PROGRESS", "PAUSED"] } }, data: { timeRemaining: remaining } })
        : null,
    ]);

    return NextResponse.json({ success: true, saved: answers.length, timeRemaining: remaining });
  } catch (error) {
    console.error("[SYNC_PUT]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

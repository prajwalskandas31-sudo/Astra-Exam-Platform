import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import { appBaseUrl } from "@/lib/reportLinks";
import { sendResult } from "@/lib/messaging/automations";
import { acceptsAnswers, parseIncomingAnswers, scheduleRerank, serverTimeRemaining } from "@/lib/attempts";
import { finalizeAttempt, missedQuestionIds } from "@/lib/grading";
import { logStudy, queueForReview } from "@/lib/study";

const OPEN_STATUSES = ["IN_PROGRESS", "PAUSED"] as const;

/**
 * Body: { reason?: "MANUAL" | "TIMEOUT" | "VIOLATIONS", answers?: final answers }.
 * Safe to retry: a second call for an already-graded attempt just returns it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      select: {
        id: true, userId: true, testId: true, status: true, startTime: true, timeRemaining: true, isRetry: true,
        test: { select: { duration: true } },
      },
    });
    if (!attempt || attempt.userId !== session.user.id) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    if (!(OPEN_STATUSES as readonly string[]).includes(attempt.status)) {
      return NextResponse.json(await prisma.attempt.findUnique({ where: { id } }));
    }

    const body = await request.json().catch(() => null);
    const reason: string | undefined = body?.reason;
    const timedOut = serverTimeRemaining(attempt, attempt.test.duration) <= 0;

    const graded = await finalizeAttempt(attempt, {
      finalAnswers: parseIncomingAnswers(body?.answers),
      acceptFinalAnswers: acceptsAnswers(attempt, attempt.test.duration),
      autoSubmitted: timedOut || reason === "VIOLATIONS" || reason === "TIMEOUT",
    });

    // Another request submitted it first: return that result
    if (!graded) return NextResponse.json(await prisma.attempt.findUnique({ where: { id } }));
    const { updated, result } = graded;

    // Feed the study loop: missed questions go to spaced review, answered ones count toward today's goal
    await Promise.all([
      queueForReview(attempt.userId, missedQuestionIds(result)),
      logStudy(attempt.userId, { questions: result.attemptedCount }),
    ]).catch((e) => console.error("[SUBMIT_STUDY_LOG]", e));

    // Result alert with a short report link to the student and linked parents (WhatsApp/SMS),
    // sent after the response so the student sees their result immediately
    const baseUrl = appBaseUrl(request);
    after(() => sendResult(attempt.id, baseUrl).catch((e) => console.error("[SUBMIT_RESULT_ALERT]", e)));
    // Earlier finishers' ranks shift as better scores come in
    if (!attempt.isRetry) after(() => scheduleRerank(attempt.testId).catch((e) => console.error("[SUBMIT_RERANK]", e)));

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[SUBMIT_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

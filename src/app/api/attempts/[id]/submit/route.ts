import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import { appBaseUrl } from "@/lib/reportLinks";
import { sendResult } from "@/lib/messaging/automations";
import { gradeAttempt } from "@/lib/scoring";
import { attemptQuestionFilter, isFinished, serverTimeRemaining } from "@/lib/attempts";
import { logStudy, queueForReview } from "@/lib/study";

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
      include: {
        test: {
          include: {
            questions: { include: { question: true } }
          }
        },
        answers: true,
        _count: { select: { violations: true } }
      }
    });

    if (!attempt || attempt.userId !== session.user.id) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    if (isFinished(attempt.status)) {
      return NextResponse.json(attempt);
    }

    let reason: string | undefined;
    try {
      reason = (await request.json())?.reason;
    } catch {
      // empty body is fine
    }

    const questions = attemptQuestionFilter(attempt, attempt.test.questions).map((tq) => tq.question);
    const result = gradeAttempt(questions, attempt.answers);

    // Persist per-answer correctness so reviews, mistakes and analytics can use it
    await prisma.$transaction(
      attempt.answers
        .filter((a) => result.perQuestion[a.questionId])
        .map((a) => {
          const pq = result.perQuestion[a.questionId];
          return prisma.answer.update({
            where: { id: a.id },
            data: { isCorrect: pq.isCorrect, subject: pq.subject, chapter: pq.chapter, topic: pq.topic }
          });
        })
    );

    const finishedAttempts = await prisma.attempt.findMany({
      where: { testId: attempt.testId, status: { in: ["COMPLETED", "AUTO_SUBMITTED"] }, isRetry: false, id: { not: id } },
      select: { score: true }
    });
    const higher = finishedAttempts.filter((a) => (a.score ?? 0) > result.score).length;
    const lowerOrEqual = finishedAttempts.length - higher;
    const rank = higher + 1;
    const percentile = finishedAttempts.length > 0 ? Math.round((lowerOrEqual / finishedAttempts.length) * 1000) / 10 : 100;

    const timedOut = serverTimeRemaining(attempt, attempt.test.duration) <= 0;
    const autoSubmitted = timedOut || reason === "VIOLATIONS" || reason === "TIMEOUT";

    const updatedAttempt = await prisma.attempt.update({
      where: { id },
      data: {
        status: autoSubmitted ? "AUTO_SUBMITTED" : "COMPLETED",
        score: result.score,
        percentage: result.percentage,
        accuracy: result.accuracy,
        attemptedCount: result.attemptedCount,
        correctCount: result.correctCount,
        incorrectCount: result.incorrectCount,
        unattemptedCount: result.unattemptedCount,
        rank,
        percentile,
        subjectScores: JSON.stringify(result.subjectScores),
        chapterScores: JSON.stringify(result.chapterScores),
        topicScores: JSON.stringify(result.topicScores),
        weakTopics: JSON.stringify(result.weakTopics),
        strongTopics: JSON.stringify(result.strongTopics),
        endTime: new Date()
      }
    });

    // Feed the study loop: missed questions go to spaced review, answered ones count toward today's goal
    const missed = Object.entries(result.perQuestion)
      .filter(([, pq]) => pq.isCorrect === false)
      .map(([questionId]) => questionId);
    await Promise.all([
      queueForReview(attempt.userId, missed),
      logStudy(attempt.userId, { questions: result.attemptedCount }),
    ]).catch((e) => console.error("[SUBMIT_STUDY_LOG]", e));

    // Result alert with a short report link to the student and linked parents (WhatsApp/SMS),
    // sent after the response so the student sees their result immediately
    const baseUrl = appBaseUrl(request);
    after(() => sendResult(attempt.id, baseUrl).catch((e) => console.error("[SUBMIT_RESULT_ALERT]", e)));

    return NextResponse.json(updatedAttempt);
  } catch (error) {
    console.error("[SUBMIT_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

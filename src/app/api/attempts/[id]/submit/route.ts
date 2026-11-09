import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import { appBaseUrl } from "@/lib/reportLinks";
import { sendResult } from "@/lib/messaging/automations";
import { gradeAttempt } from "@/lib/scoring";
import { acceptsAnswers, attemptQuestionFilter, parseIncomingAnswers, saveAnswers, scheduleRerank, serverTimeRemaining } from "@/lib/attempts";
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
    const finalAnswers = parseIncomingAnswers(body?.answers);

    // Load the questions outside the transaction to keep it short
    const testQuestions = await prisma.testQuestion.findMany({
      where: { testId: attempt.testId },
      select: {
        questionId: true,
        question: {
          select: {
            id: true, subject: true, chapter: true, topic: true, difficulty: true, questionType: true,
            correctOption: true, marks: true, negativeMarks: true,
          },
        },
      },
    });

    const timedOut = serverTimeRemaining(attempt, attempt.test.duration) <= 0;
    const autoSubmitted = timedOut || reason === "VIOLATIONS" || reason === "TIMEOUT";

    const graded = await prisma.$transaction(
      async (tx) => {
        // Lock the attempt first. A concurrent submit waits here and then finds it closed; an
        // autosave (FOR SHARE) either finishes before this or is rejected after it.
        const [locked] = await tx.$queryRaw<{ status: string }[]>`SELECT "status" FROM "Attempt" WHERE "id" = ${id} FOR UPDATE`;
        if (!locked || !(OPEN_STATUSES as readonly string[]).includes(locked.status)) return null;

        if (finalAnswers.length && acceptsAnswers(attempt, attempt.test.duration)) {
          await saveAnswers(id, attempt.testId, finalAnswers, tx);
        }

        await tx.attempt.update({
          where: { id },
          data: { status: autoSubmitted ? "AUTO_SUBMITTED" : "COMPLETED", endTime: new Date() },
        });

        const answers = await tx.answer.findMany({
          where: { attemptId: id },
          select: { id: true, questionId: true, selectedOpt: true, timeSpent: true },
        });
        const questions = attemptQuestionFilter({ isRetry: attempt.isRetry, answers }, testQuestions).map((tq) => tq.question);
        const result = gradeAttempt(questions, answers);

        // Persist per-answer correctness (one statement) for reviews, mistakes and analytics
        const toMark = answers.filter((a) => result.perQuestion[a.questionId]);
        if (toMark.length) {
          const pq = toMark.map((a) => result.perQuestion[a.questionId]);
          await tx.$executeRaw`
            UPDATE "Answer" AS a SET
              "isCorrect" = x.correct, "subject" = x.subject, "chapter" = x.chapter, "topic" = x.topic
            FROM unnest(
              ${toMark.map((a) => a.id)}::text[], ${pq.map((p) => p.isCorrect)}::boolean[],
              ${pq.map((p) => p.subject)}::text[], ${pq.map((p) => p.chapter)}::text[], ${pq.map((p) => p.topic)}::text[]
            ) AS x(id, correct, subject, chapter, topic)
            WHERE a."id" = x.id`;
        }

        // Rank among first attempts at this test, from two index-only counts
        const peers = { testId: attempt.testId, status: { in: ["COMPLETED" as const, "AUTO_SUBMITTED" as const] }, isRetry: false, id: { not: id } };
        const [others, higher] = await Promise.all([
          tx.attempt.count({ where: peers }),
          tx.attempt.count({ where: { ...peers, score: { gt: result.score } } }),
        ]);
        const percentile = others > 0 ? Math.round(((others - higher) / others) * 1000) / 10 : 100;

        const updated = await tx.attempt.update({
          where: { id },
          data: {
            score: result.score,
            percentage: result.percentage,
            accuracy: result.accuracy,
            attemptedCount: result.attemptedCount,
            correctCount: result.correctCount,
            incorrectCount: result.incorrectCount,
            unattemptedCount: result.unattemptedCount,
            rank: higher + 1,
            percentile,
            subjectScores: JSON.stringify(result.subjectScores),
            chapterScores: JSON.stringify(result.chapterScores),
            topicScores: JSON.stringify(result.topicScores),
            weakTopics: JSON.stringify(result.weakTopics),
            strongTopics: JSON.stringify(result.strongTopics),
          },
        });
        return { updated, result };
      },
      { maxWait: 10_000, timeout: 20_000 }
    );

    // Another request submitted it first: return that result
    if (!graded) return NextResponse.json(await prisma.attempt.findUnique({ where: { id } }));
    const { updated, result } = graded;

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
    // Earlier finishers' ranks shift as better scores come in
    if (!attempt.isRetry) after(() => scheduleRerank(attempt.testId).catch((e) => console.error("[SUBMIT_RERANK]", e)));

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[SUBMIT_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

import type { Attempt } from "@prisma/client";
import { prisma } from "./prisma";
import { gradeAttempt, type GradeResult } from "./scoring";
import { attemptQuestionFilter, saveAnswers, type IncomingAnswer } from "./attempts";

const OPEN_STATUSES = ["IN_PROGRESS", "PAUSED"];

/**
 * Close and grade an attempt in one short transaction. Shared by the online submit route and
 * the offline-upload worker, so both grade identically.
 *
 * - `finalAnswers` are written first (only when `acceptFinalAnswers`).
 * - Returns null when the attempt was already closed (a concurrent submit won), so callers can
 *   treat a retry as success.
 */
export async function finalizeAttempt(
  attempt: { id: string; testId: string; isRetry: boolean },
  opts: { finalAnswers: IncomingAnswer[]; acceptFinalAnswers: boolean; autoSubmitted: boolean; endTime?: Date }
): Promise<{ updated: Attempt; result: GradeResult } | null> {
  const { id } = attempt;

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

  return prisma.$transaction(
    async (tx) => {
      // Lock the attempt first. A concurrent submit waits here and then finds it closed; an
      // autosave (FOR SHARE) either finishes before this or is rejected after it.
      const [locked] = await tx.$queryRaw<{ status: string }[]>`SELECT "status" FROM "Attempt" WHERE "id" = ${id} FOR UPDATE`;
      if (!locked || !OPEN_STATUSES.includes(locked.status)) return null;

      if (opts.finalAnswers.length && opts.acceptFinalAnswers) {
        await saveAnswers(id, attempt.testId, opts.finalAnswers, tx);
      }

      await tx.attempt.update({
        where: { id },
        data: { status: opts.autoSubmitted ? "AUTO_SUBMITTED" : "COMPLETED", endTime: opts.endTime ?? new Date() },
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
}

/** Question IDs the student got wrong, for the spaced-review queue. */
export const missedQuestionIds = (result: GradeResult) =>
  Object.entries(result.perQuestion)
    .filter(([, pq]) => pq.isCorrect === false)
    .map(([questionId]) => questionId);

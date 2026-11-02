import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import { parseOptions } from "@/lib/questions";

interface Bucket {
  name: string;
  total: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  timeSpent: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function addTo(map: Map<string, Bucket>, name: string, outcome: "correct" | "incorrect" | "unattempted", timeSpent: number) {
  const b = map.get(name) ?? { name, total: 0, correct: 0, incorrect: 0, unattempted: 0, timeSpent: 0 };
  b.total++;
  b[outcome]++;
  b.timeSpent += timeSpent;
  map.set(name, b);
}

const finalize = (map: Map<string, Bucket>) =>
  [...map.values()]
    .map((b) => ({
      ...b,
      accuracy: b.correct + b.incorrect > 0 ? round1((b.correct / (b.correct + b.incorrect)) * 100) : 0,
      avgTime: b.total > 0 ? Math.round(b.timeSpent / b.total) : 0
    }))
    .sort((a, b) => b.total - a.total);

/** Aggregated performance data for the student Analysis and Mistakes pages. */
export async function GET() {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const attempts = await prisma.attempt.findMany({
      where: { userId: session.user.id, status: { in: ["COMPLETED", "AUTO_SUBMITTED"] } },
      include: {
        test: { select: { id: true, title: true, type: true } },
        answers: {
          include: {
            question: {
              select: {
                id: true, text: true, options: true, correctOption: true, explanation: true,
                subject: true, chapter: true, topic: true, difficulty: true, questionType: true, marks: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    const bySubject = new Map<string, Bucket>();
    const byChapter = new Map<string, Bucket>();
    const byDifficulty = new Map<string, Bucket>();
    const byType = new Map<string, Bucket>();
    const mistakes: unknown[] = [];

    for (const attempt of attempts) {
      for (const ans of attempt.answers) {
        const q = ans.question;
        const outcome = ans.isCorrect === true ? "correct" : ans.selectedOpt ? "incorrect" : "unattempted";
        addTo(bySubject, q.subject || "General", outcome, ans.timeSpent);
        addTo(byChapter, q.chapter || q.topic || "General", outcome, ans.timeSpent);
        addTo(byDifficulty, (q.difficulty || "MEDIUM").toUpperCase(), outcome, ans.timeSpent);
        addTo(byType, q.questionType, outcome, ans.timeSpent);

        if (outcome !== "correct") {
          mistakes.push({
            answerId: ans.id,
            attemptId: attempt.id,
            testTitle: attempt.test.title,
            date: attempt.createdAt,
            outcome,
            selected: ans.selectedOpt,
            timeSpent: ans.timeSpent,
            question: { ...q, options: parseOptions(q.options) }
          });
        }
      }
    }

    const timeline = attempts.map((a) => ({
      attemptId: a.id,
      testTitle: a.test.title,
      testType: a.test.type,
      isRetry: a.isRetry,
      date: a.createdAt,
      score: a.score ?? 0,
      percentage: round1(a.percentage ?? 0),
      accuracy: round1(a.accuracy ?? 0),
      percentile: a.percentile,
      rank: a.rank,
      correct: a.correctCount ?? 0,
      incorrect: a.incorrectCount ?? 0,
      unattempted: a.unattemptedCount ?? 0,
      total: (a.correctCount ?? 0) + (a.incorrectCount ?? 0) + (a.unattemptedCount ?? 0),
      timeTaken: a.endTime ? Math.round((a.endTime.getTime() - a.startTime.getTime()) / 1000) : null
    }));

    const finished = timeline.filter((t) => !t.isRetry);
    const summary = {
      testsTaken: finished.length,
      avgPercentage: finished.length ? round1(finished.reduce((s, t) => s + t.percentage, 0) / finished.length) : 0,
      avgAccuracy: finished.length ? round1(finished.reduce((s, t) => s + t.accuracy, 0) / finished.length) : 0,
      bestPercentage: finished.length ? Math.max(...finished.map((t) => t.percentage)) : 0,
      totalQuestions: [...bySubject.values()].reduce((s, b) => s + b.total, 0),
      totalMistakes: mistakes.length
    };

    return NextResponse.json({
      summary,
      timeline,
      subjects: finalize(bySubject),
      chapters: finalize(byChapter),
      difficulty: finalize(byDifficulty),
      questionTypes: finalize(byType),
      mistakes: mistakes.reverse().slice(0, 300)
    });
  } catch (error) {
    console.error("[STUDENT_INSIGHTS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

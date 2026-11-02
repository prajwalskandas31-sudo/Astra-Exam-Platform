import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, safeJson } from "@/lib/api";
import { attemptQuestionFilter, isFinished } from "@/lib/attempts";

const MODES = ["RETRY_ALL", "RETRY_INCORRECT", "RETRY_UNATTEMPTED", "WEAK_TOPICS"] as const;
type RetestMode = (typeof MODES)[number];

export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const { parentAttemptId, mode } = (await request.json()) as { parentAttemptId?: string; mode?: RetestMode };
    if (!parentAttemptId || !mode || !MODES.includes(mode)) {
      return NextResponse.json({ error: "parentAttemptId and a valid mode are required" }, { status: 400 });
    }

    const parentAttempt = await prisma.attempt.findUnique({
      where: { id: parentAttemptId },
      include: {
        test: { include: { questions: { include: { question: true }, orderBy: { order: "asc" } } } },
        answers: true
      }
    });

    if (!parentAttempt || parentAttempt.userId !== session.user.id) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    if (!isFinished(parentAttempt.status)) {
      return NextResponse.json({ error: "Finish this attempt before retesting" }, { status: 400 });
    }

    const scope = attemptQuestionFilter(parentAttempt, parentAttempt.test.questions);
    const answerByQ = new Map(parentAttempt.answers.map((a) => [a.questionId, a]));
    let target = scope;

    if (mode === "RETRY_INCORRECT") {
      target = scope.filter((tq) => answerByQ.get(tq.questionId)?.isCorrect === false);
    } else if (mode === "RETRY_UNATTEMPTED") {
      target = scope.filter((tq) => !answerByQ.get(tq.questionId)?.selectedOpt);
    } else if (mode === "WEAK_TOPICS") {
      const weak = new Set(safeJson<string[]>(parentAttempt.weakTopics, []));
      target = scope.filter((tq) => weak.has(tq.question.topic || "General"));
    }

    if (target.length === 0) {
      const messages: Record<RetestMode, string> = {
        RETRY_ALL: "This attempt has no questions.",
        RETRY_INCORRECT: "No incorrect answers in this attempt — nice work!",
        RETRY_UNATTEMPTED: "You attempted every question in this test.",
        WEAK_TOPICS: "No weak topics were detected in this attempt."
      };
      return NextResponse.json({ error: messages[mode] }, { status: 400 });
    }

    // Scale the clock to the subset, with a sensible floor
    const fullCount = Math.max(1, parentAttempt.test.questions.length);
    const seconds = Math.max(5 * 60, Math.round((parentAttempt.test.duration * 60 * target.length) / fullCount));

    const newAttempt = await prisma.attempt.create({
      data: {
        userId: session.user.id,
        testId: parentAttempt.testId,
        mode: parentAttempt.mode,
        status: "IN_PROGRESS",
        timeRemaining: seconds,
        isRetry: true,
        parentAttemptId: parentAttempt.id,
        answers: {
          create: target.map((tq) => ({ questionId: tq.questionId, status: "NOT_VISITED", timeSpent: 0 }))
        }
      }
    });

    return NextResponse.json({ attemptId: newAttempt.id, questionCount: target.length });
  } catch (error) {
    console.error("[RETEST_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

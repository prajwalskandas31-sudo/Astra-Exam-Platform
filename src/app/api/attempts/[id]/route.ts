import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import { attemptQuestionFilter, canViewAttempt, isFinished, serverTimeRemaining } from "@/lib/attempts";
import { getTestPaper } from "@/lib/testPaper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { session, error } = await requireRole();
    if (error) return error;

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, organizationId: true } },
        answers: true,
        _count: { select: { violations: true } }
      }
    });

    if (!attempt) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    if (!(await canViewAttempt(session, attempt))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // The paper is shared by everyone taking the test, so it comes from a short-lived cache
    const test = await getTestPaper(attempt.testId);
    if (!test) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const finished = isFinished(attempt.status);
    const questions = attemptQuestionFilter(attempt, test.questions).map((tq) => {
      // Never reveal answers or explanations while the attempt is still running
      if (finished) return tq;
      const { correctOption: _c, explanation: _e, ...safeQuestion } = tq.question;
      return { ...tq, question: safeQuestion };
    });

    const maxScore = questions.reduce((sum, tq) => sum + (tq.question.marks ?? 1), 0);

    return NextResponse.json({
      ...attempt,
      timeRemaining: finished ? attempt.timeRemaining : serverTimeRemaining(attempt, test.duration),
      maxScore,
      violationCount: attempt._count.violations,
      test: { ...test, questions }
    });
  } catch (error) {
    console.error("[ATTEMPT_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import { attemptQuestionFilter, canViewAttempt, isFinished, serverTimeRemaining } from "@/lib/attempts";

export async function GET(
  request: Request,
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
        test: {
          include: {
            template: true,
            questions: {
              include: { question: true },
              orderBy: { order: "asc" }
            }
          }
        },
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

    const finished = isFinished(attempt.status);
    const questions = attemptQuestionFilter(attempt, attempt.test.questions).map((tq) => {
      // Never reveal answers or explanations while the attempt is still running
      if (finished) return tq;
      const { correctOption: _c, explanation: _e, ...safeQuestion } = tq.question;
      return { ...tq, question: safeQuestion };
    });

    const maxScore = questions.reduce((sum, tq) => sum + (tq.question.marks ?? 1), 0);

    return NextResponse.json({
      ...attempt,
      timeRemaining: finished ? attempt.timeRemaining : serverTimeRemaining(attempt, attempt.test.duration),
      maxScore,
      violationCount: attempt._count.violations,
      test: { ...attempt.test, questions }
    });
  } catch (error) {
    console.error("[ATTEMPT_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

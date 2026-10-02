import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STUDENT") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { parentAttemptId, mode } = body; // mode: 'RETRY_ALL' | 'RETRY_INCORRECT' | 'RETRY_UNATTEMPTED' | 'WEAK_TOPICS'

    const parentAttempt = await prisma.attempt.findUnique({
      where: { id: parentAttemptId },
      include: {
        test: {
          include: {
            questions: {
              include: { question: true }
            }
          }
        },
        answers: {
          include: { question: true }
        }
      }
    });

    if (!parentAttempt) {
      return new NextResponse("Attempt not found", { status: 404 });
    }

    let targetQuestionIds: string[] = [];

    if (mode === 'RETRY_INCORRECT') {
      targetQuestionIds = parentAttempt.answers
        .filter((a) => a.isCorrect === false)
        .map((a) => a.questionId);
    } else if (mode === 'RETRY_UNATTEMPTED') {
      const answeredQIds = new Set(parentAttempt.answers.filter((a) => a.selectedOpt).map((a) => a.questionId));
      targetQuestionIds = parentAttempt.test.questions
        .map((tq) => tq.questionId)
        .filter((qId) => !answeredQIds.has(qId));
    } else if (mode === 'WEAK_TOPICS') {
      const weakList: string[] = parentAttempt.weakTopics ? JSON.parse(parentAttempt.weakTopics) : [];
      targetQuestionIds = parentAttempt.test.questions
        .filter((tq) => weakList.includes(tq.question.topic || ''))
        .map((tq) => tq.questionId);
    }

    // Fallback if list is empty
    if (targetQuestionIds.length === 0) {
      targetQuestionIds = parentAttempt.test.questions.map((tq) => tq.questionId);
    }

    // Create a new Retest Attempt
    const newAttempt = await prisma.attempt.create({
      data: {
        userId: session.user.id,
        testId: parentAttempt.testId,
        mode: parentAttempt.mode,
        status: "IN_PROGRESS",
        timeRemaining: parentAttempt.test.duration * 60,
        isRetry: true,
        parentAttemptId: parentAttempt.id,
        answers: {
          create: targetQuestionIds.map((qId) => ({
            questionId: qId,
            status: "UNANSWERED",
            timeSpent: 0
          }))
        }
      }
    });

    return NextResponse.json({ attemptId: newAttempt.id });
  } catch (error) {
    console.error("[RETEST_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}



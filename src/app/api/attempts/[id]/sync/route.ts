import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STUDENT") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { answers, timeRemaining } = body;

    if (!answers || timeRemaining === undefined) {
      return new NextResponse("Invalid payload", { status: 400 });
    }

    const attempt = await prisma.attempt.findUnique({
      where: { id },
    });

    if (!attempt || attempt.userId !== session.user.id) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (attempt.status === "COMPLETED") {
      return new NextResponse("Attempt already completed", { status: 400 });
    }

    // Update Attempt Time
    await prisma.attempt.update({
      where: { id },
      data: { timeRemaining },
    });

    // Upsert Answers
    // `answers` is expected to be a Record<string, AnswerState>
    // e.g. { "q1": { questionId: "q1", selectedOption: "A", status: "ANSWERED", timeSpent: 10 } }
    const answerPromises = Object.values(answers).map((ans: any) => {
      // Prisma requires us to handle the unique constraint `attemptId_questionId`
      return prisma.answer.upsert({
        where: {
          attemptId_questionId: {
            attemptId: id,
            questionId: ans.questionId,
          },
        },
        update: {
          selectedOpt: ans.selectedOption,
          status: ans.status,
          timeSpent: ans.timeSpent || 0,
        },
        create: {
          attemptId: id,
          questionId: ans.questionId,
          selectedOpt: ans.selectedOption,
          status: ans.status,
          timeSpent: ans.timeSpent || 0,
        },
      });
    });

    await Promise.all(answerPromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SYNC_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}



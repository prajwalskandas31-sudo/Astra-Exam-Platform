import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import { isFinished, serverTimeRemaining } from "@/lib/attempts";

interface IncomingAnswer {
  questionId: string;
  selectedOption: string | null;
  status: string;
  timeSpent?: number;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const body = await request.json();
    const { answers, timeRemaining } = body as { answers?: Record<string, IncomingAnswer>; timeRemaining?: number };

    if (!answers || typeof answers !== "object" || typeof timeRemaining !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: { test: { select: { duration: true, questions: { select: { questionId: true } } } } }
    });

    if (!attempt || attempt.userId !== session.user.id) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    if (isFinished(attempt.status)) {
      return NextResponse.json({ error: "Attempt already submitted" }, { status: 409 });
    }

    // The client can't extend its own clock: take the lower of client and server time
    const remaining = Math.max(0, Math.min(Math.floor(timeRemaining), serverTimeRemaining(attempt, attempt.test.duration)));
    const validIds = new Set(attempt.test.questions.map((q) => q.questionId));
    const valid = Object.values(answers).filter((a) => a && validIds.has(a.questionId));

    await prisma.$transaction([
      prisma.attempt.update({ where: { id }, data: { timeRemaining: remaining } }),
      ...valid.map((ans) => {
        const data = {
          selectedOpt: ans.selectedOption ? String(ans.selectedOption).slice(0, 200) : null,
          status: String(ans.status || "UNANSWERED"),
          timeSpent: Math.max(0, Math.floor(ans.timeSpent || 0)),
        };
        return prisma.answer.upsert({
          where: { attemptId_questionId: { attemptId: id, questionId: ans.questionId } },
          update: data,
          create: { attemptId: id, questionId: ans.questionId, ...data },
        });
      }),
    ]);

    return NextResponse.json({ success: true, timeRemaining: remaining });
  } catch (error) {
    console.error("[SYNC_PUT]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

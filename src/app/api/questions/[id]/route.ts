import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "INSTITUTE_ADMIN" && session.user.role !== "FACULTY")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Need to await params in Next.js 16 app router dynamic routes
    const { id } = await params;
    const body = await request.json();

    const { text, options, correctOption, marks, negativeMarks, status, difficulty, tags } = body;

    const existing = await prisma.question.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Only allow updating certain fields
    const updated = await prisma.question.update({
      where: { id },
      data: {
        text: text !== undefined ? text : existing.text,
        options: options !== undefined ? (typeof options === 'string' ? options : JSON.stringify(options)) : existing.options,
        correctOption: correctOption !== undefined ? correctOption : existing.correctOption,
        marks: marks !== undefined ? Number(marks) : existing.marks,
        negativeMarks: negativeMarks !== undefined ? Number(negativeMarks) : existing.negativeMarks,
        // @ts-ignore
        status: status !== undefined ? status : existing.status,
        difficulty: difficulty !== undefined ? difficulty : existing.difficulty,
        tags: tags !== undefined ? tags : existing.tags
      }
    });

    return NextResponse.json({ success: true, question: updated });
  } catch (error) {
    console.error("[QUESTION_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

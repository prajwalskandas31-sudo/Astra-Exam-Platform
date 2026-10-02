import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MENTOR")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();

    let questionsToInsert = body;
    let sourceFile: string | null = null;

    if (!Array.isArray(body) && body.questions && Array.isArray(body.questions)) {
      questionsToInsert = body.questions;
      sourceFile = body.sourceFile || null;
    } else if (!Array.isArray(body)) {
      return new NextResponse("Invalid JSON format. Expected an array of questions.", { status: 400 });
    }

    const createdCount = await prisma.$transaction(
      questionsToInsert.map((q: any) => 
        prisma.question.create({
          data: {
            text: q.text,
            options: typeof q.options === 'string' ? q.options : JSON.stringify(q.options),
            correctOption: q.correctOption,
            explanation: q.explanation || null,
            subject: q.subject,
            topic: q.topic,
            difficulty: q.difficulty || "MEDIUM",
            tags: Array.isArray(q.tags) ? q.tags.join(',') : (q.tags || ""),
            estimatedTime: q.estimatedTime || 60,
            sourceFile: q.sourceFile || sourceFile || null,
          }
        })
      )
    );

    return NextResponse.json({ success: true, count: createdCount.length });
  } catch (error) {
    console.error("[QUESTIONS_BULK_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}



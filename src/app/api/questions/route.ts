import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["SUPER_ADMIN", "INSTITUTE_ADMIN", "FACULTY", "MENTOR", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject");
    const chapter = searchParams.get("chapter");
    const difficulty = searchParams.get("difficulty");
    const examCategory = searchParams.get("examCategory");
    const questionType = searchParams.get("questionType");
    const search = searchParams.get("search");

    const where: any = {};
    if (subject) where.subject = subject;
    if (chapter) where.chapter = chapter;
    if (difficulty) where.difficulty = difficulty;
    if (examCategory) where.examCategory = examCategory;
    if (questionType) where.questionType = questionType as any;
    if (search) {
      where.OR = [
        { text: { contains: search } },
        { topic: { contains: search } },
        { tags: { contains: search } }
      ];
    }

    // Tenant isolation for non-super-admin
    if (session.user.role !== "SUPER_ADMIN" && session.user.organizationId) {
      where.OR = [
        { organizationId: session.user.organizationId },
        { organizationId: null }
      ];
    }

    const questions = await prisma.question.findMany({
      where,
      include: {
        _count: {
          select: { 
            tests: true,
            answers: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error("[QUESTIONS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["SUPER_ADMIN", "INSTITUTE_ADMIN", "FACULTY", "MENTOR", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      text, 
      options, 
      correctOption, 
      explanation, 
      subject, 
      chapter,
      topic, 
      subtopic,
      difficulty, 
      questionType,
      marks,
      negativeMarks,
      examCategory,
      tags, 
      estimatedTime 
    } = body;

    const question = await prisma.question.create({
      data: {
        text,
        options: typeof options === 'string' ? options : JSON.stringify(options),
        correctOption,
        explanation,
        subject,
        chapter,
        topic,
        subtopic,
        difficulty: difficulty || 'MEDIUM',
        questionType: questionType || 'SINGLE_CHOICE',
        marks: marks || 1,
        negativeMarks: negativeMarks || 0,
        examCategory,
        tags: Array.isArray(tags) ? tags.join(',') : (tags || ''),
        estimatedTime: estimatedTime || 60,
        organizationId: session.user.organizationId
      }
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error("[QUESTIONS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}



import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantOrGlobalWhere } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";
import { QUESTION_TYPES, normalizeQuestion } from "@/lib/questions";

export async function GET(request: Request) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const filters: Prisma.QuestionWhereInput[] = [tenantOrGlobalWhere(session)];

    for (const key of ["subject", "chapter", "topic", "difficulty", "examCategory", "status", "sourceFile"] as const) {
      const value = searchParams.get(key);
      if (value) filters.push({ [key]: value });
    }
    const questionType = searchParams.get("questionType");
    if (questionType && (QUESTION_TYPES as readonly string[]).includes(questionType)) {
      filters.push({ questionType: questionType as (typeof QUESTION_TYPES)[number] });
    }
    const search = searchParams.get("search")?.trim();
    if (search) {
      filters.push({
        OR: [
          { text: { contains: search, mode: "insensitive" } },
          { topic: { contains: search, mode: "insensitive" } },
          { chapter: { contains: search, mode: "insensitive" } },
          { tags: { contains: search, mode: "insensitive" } }
        ]
      });
    }

    const questions = await prisma.question.findMany({
      where: { AND: filters },
      include: { _count: { select: { tests: true, answers: true } } },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error("[QUESTIONS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const { data, error: validationError } = normalizeQuestion(await request.json());
    if (!data) return NextResponse.json({ error: validationError }, { status: 400 });

    const question = await prisma.question.create({
      data: { ...data, organizationId: session.user.organizationId ?? null }
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error("[QUESTIONS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

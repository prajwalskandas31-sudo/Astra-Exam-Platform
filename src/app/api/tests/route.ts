import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantOrGlobalWhere } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";

export async function GET(request: Request) {
  try {
    const { session, error } = await requireRole();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    // Private custom quizzes (ownerId set) belong to one student and never appear in listings
    const where: Prisma.TestWhereInput = { ownerId: null, ...tenantOrGlobalWhere(session) };
    if (session.user.role === "STUDENT" || session.user.role === "PARENT") where.isPublished = true;
    if (type === "MOCK" || type === "PRACTICE") where.type = type;

    const tests = await prisma.test.findMany({
      where,
      include: {
        template: { select: { name: true, examCategory: true } },
        attempts: {
          where: { userId: session.user.id },
          select: { id: true, status: true, score: true, percentage: true, accuracy: true, isRetry: true, createdAt: true },
          orderBy: { createdAt: "desc" }
        },
        _count: { select: { questions: true, attempts: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(tests);
  } catch (error) {
    console.error("[TESTS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const duration = Number(body.duration);
    const questionIds: string[] = Array.isArray(body.questionIds) ? body.questionIds.filter((id: unknown) => typeof id === "string") : [];

    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!Number.isInteger(duration) || duration < 1 || duration > 600) {
      return NextResponse.json({ error: "Duration must be between 1 and 600 minutes" }, { status: 400 });
    }
    if (questionIds.length === 0) {
      return NextResponse.json({ error: "Select at least one question" }, { status: 400 });
    }

    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds }, ...tenantOrGlobalWhere(session) },
      select: { id: true, marks: true, subject: true }
    });
    if (questions.length !== new Set(questionIds).size) {
      return NextResponse.json({ error: "Some selected questions were not found" }, { status: 400 });
    }
    const byId = new Map(questions.map((q) => [q.id, q]));
    const totalMarks = Math.round(questions.reduce((sum, q) => sum + (q.marks || 1), 0));

    const templateId = typeof body.templateId === "string" && body.templateId ? body.templateId : null;
    const test = await prisma.test.create({
      data: {
        title,
        description: typeof body.description === "string" ? body.description.trim() || null : null,
        duration,
        totalMarks,
        type: body.type === "MOCK" ? "MOCK" : "PRACTICE",
        mode: body.mode === "OMR" ? "OMR" : "CBT",
        isPublished: !!body.isPublished,
        status: body.isPublished ? "ACTIVE" : "DRAFT",
        templateId,
        scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : null,
        scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : null,
        organizationId: session.user.organizationId ?? null,
        questions: {
          create: [...new Set(questionIds)].map((id, index) => ({
            question: { connect: { id } },
            order: index,
            section: byId.get(id)?.subject || null
          }))
        }
      }
    });

    return NextResponse.json(test);
  } catch (error) {
    console.error("[TESTS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

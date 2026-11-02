import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantOrGlobalWhere } from "@/lib/api";
import { parseOptions } from "@/lib/questions";
import { FINISHED_STATUSES } from "@/lib/attempts";

export async function GET(request: Request) {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    // ?ids=1 returns only the bookmarked question ids (cheap, used by the exam UI)
    if (new URL(request.url).searchParams.get("ids")) {
      const rows = await prisma.bookmark.findMany({ where: { userId: session.user.id }, select: { questionId: true } });
      return NextResponse.json(rows.map((r) => r.questionId));
    }

    const bookmarks = await prisma.bookmark.findMany({
      // Never return questions outside the student's institute, even if a bookmark points at one
      where: { userId: session.user.id, question: tenantOrGlobalWhere(session) },
      include: {
        question: {
          select: {
            id: true, text: true, options: true, correctOption: true, explanation: true,
            subject: true, chapter: true, topic: true, difficulty: true, questionType: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Only reveal answers for questions the student has already been graded on
    const graded = new Set(
      (await prisma.answer.findMany({
        where: {
          questionId: { in: bookmarks.map((b) => b.questionId) },
          attempt: { userId: session.user.id, status: { in: [...FINISHED_STATUSES] } }
        },
        select: { questionId: true }
      })).map((a) => a.questionId)
    );

    return NextResponse.json(
      bookmarks.map((b) => {
        const revealed = graded.has(b.questionId);
        return {
          id: b.id,
          note: b.note,
          createdAt: b.createdAt,
          revealed,
          question: {
            ...b.question,
            options: parseOptions(b.question.options),
            correctOption: revealed ? b.question.correctOption : null,
            explanation: revealed ? b.question.explanation : null
          }
        };
      })
    );
  } catch (error) {
    console.error("[BOOKMARKS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/** Toggle a bookmark. Body: { questionId, note? } */
export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const { questionId, note } = await request.json();
    if (typeof questionId !== "string" || !questionId) {
      return NextResponse.json({ error: "questionId is required" }, { status: 400 });
    }

    const where = { userId_questionId: { userId: session.user.id, questionId } };
    const existing = await prisma.bookmark.findUnique({ where });
    if (existing && note === undefined) {
      await prisma.bookmark.delete({ where });
      return NextResponse.json({ bookmarked: false });
    }

    const question = await prisma.question.findFirst({ where: { id: questionId, ...tenantOrGlobalWhere(session) }, select: { id: true } });
    if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    const noteValue = typeof note === "string" ? note.trim().slice(0, 1000) || null : undefined;
    await prisma.bookmark.upsert({
      where,
      update: noteValue !== undefined ? { note: noteValue } : {},
      create: { userId: session.user.id, questionId, note: noteValue ?? null }
    });
    return NextResponse.json({ bookmarked: true });
  } catch (error) {
    console.error("[BOOKMARKS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

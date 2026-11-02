import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole } from "@/lib/api";
import { parseOptions } from "@/lib/questions";
import { REVIEW_GRADES, logStudy, scheduleReview, type ReviewGrade } from "@/lib/study";

/** Review cards due now (missed questions on a spaced-repetition schedule), plus queue stats. */
export async function GET() {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;
    const userId = session.user.id;
    const now = new Date();

    const [due, dueCount, total, mastered, nextUp] = await Promise.all([
      prisma.reviewItem.findMany({
        where: { userId, dueAt: { lte: now } },
        include: {
          question: {
            select: {
              id: true, text: true, options: true, correctOption: true, explanation: true,
              subject: true, topic: true, difficulty: true, questionType: true,
            },
          },
        },
        orderBy: { dueAt: "asc" },
        take: 50,
      }),
      prisma.reviewItem.count({ where: { userId, dueAt: { lte: now } } }),
      prisma.reviewItem.count({ where: { userId } }),
      prisma.reviewItem.count({ where: { userId, intervalDays: { gte: 21 } } }),
      prisma.reviewItem.findFirst({ where: { userId, dueAt: { gt: now } }, orderBy: { dueAt: "asc" }, select: { dueAt: true } }),
    ]);

    return NextResponse.json({
      items: due.map((r) => ({
        id: r.id,
        repetitions: r.repetitions,
        lapses: r.lapses,
        intervalDays: r.intervalDays,
        question: { ...r.question, options: parseOptions(r.question.options) },
      })),
      stats: { due: dueCount, total, mastered, nextDueAt: nextUp?.dueAt ?? null },
    });
  } catch (error) {
    console.error("[REVIEWS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/** Grade one card: { itemId, grade: AGAIN | HARD | GOOD | EASY }. Removes it with { itemId, remove: true }. */
export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const body = await request.json();
    const item = typeof body.itemId === "string"
      ? await prisma.reviewItem.findFirst({ where: { id: body.itemId, userId: session.user.id } })
      : null;
    if (!item) return jsonError("Review card not found", 404);

    if (body.remove === true) {
      await prisma.reviewItem.delete({ where: { id: item.id } });
      return NextResponse.json({ removed: true });
    }

    const grade = body.grade as ReviewGrade;
    if (!REVIEW_GRADES.includes(grade)) return jsonError("grade must be AGAIN, HARD, GOOD or EASY");

    const next = scheduleReview(item, grade);
    const updated = await prisma.reviewItem.update({
      where: { id: item.id },
      data: { ...next, lastReviewedAt: new Date() },
    });
    await logStudy(session.user.id, { reviews: 1 });

    return NextResponse.json({ id: updated.id, dueAt: updated.dueAt, intervalDays: updated.intervalDays });
  } catch (error) {
    console.error("[REVIEWS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

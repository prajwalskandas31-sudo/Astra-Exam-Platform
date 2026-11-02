import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantOrGlobalWhere } from "@/lib/api";
import { serverTimeRemaining } from "@/lib/attempts";

export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const { testId } = await request.json();
    if (!testId || typeof testId !== "string") {
      return NextResponse.json({ error: "Missing testId" }, { status: 400 });
    }

    const test = await prisma.test.findFirst({
      where: { id: testId, isPublished: true, ...tenantOrGlobalWhere(session) },
      include: { _count: { select: { questions: true } } }
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found or not available" }, { status: 404 });
    }
    if (test._count.questions === 0) {
      return NextResponse.json({ error: "This test has no questions yet" }, { status: 400 });
    }
    const now = new Date();
    if (test.scheduledStart && test.scheduledStart > now) {
      return NextResponse.json({ error: `This test opens on ${test.scheduledStart.toLocaleString()}` }, { status: 400 });
    }
    if (test.scheduledEnd && test.scheduledEnd < now) {
      return NextResponse.json({ error: "This test window has closed" }, { status: 400 });
    }

    // Resume an unfinished attempt instead of creating duplicates
    const existing = await prisma.attempt.findFirst({
      where: { userId: session.user.id, testId: test.id, status: { in: ["IN_PROGRESS", "PAUSED"] }, isRetry: false },
      orderBy: { createdAt: "desc" }
    });
    if (existing && serverTimeRemaining(existing, test.duration) > 0) {
      return NextResponse.json({ attemptId: existing.id, resumed: true });
    }

    const attempt = await prisma.attempt.create({
      data: {
        userId: session.user.id,
        testId: test.id,
        mode: test.mode,
        status: "IN_PROGRESS",
        timeRemaining: test.duration * 60,
      }
    });

    return NextResponse.json({ attemptId: attempt.id, resumed: false });
  } catch (error) {
    console.error("[ATTEMPT_START_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

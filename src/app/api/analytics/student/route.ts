import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantOrGlobalWhere } from "@/lib/api";

export async function GET() {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const attempts = await prisma.attempt.findMany({
      where: { userId: session.user.id, status: { in: ["COMPLETED", "AUTO_SUBMITTED"] }, isRetry: false },
      select: { testId: true, percentage: true, accuracy: true }
    });

    const testsCompleted = attempts.length;
    const averageScore = testsCompleted > 0
      ? Math.round(attempts.reduce((acc, a) => acc + (a.percentage || 0), 0) / testsCompleted)
      : 0;
    const averageAccuracy = testsCompleted > 0
      ? Math.round(attempts.reduce((acc, a) => acc + (a.accuracy || 0), 0) / testsCompleted)
      : 0;

    const attemptedTestIds = new Set(attempts.map((a) => a.testId));
    const upcomingTests = await prisma.test.count({
      where: { isPublished: true, id: { notIn: [...attemptedTestIds] }, ...tenantOrGlobalWhere(session) }
    });

    return NextResponse.json({ averageScore, averageAccuracy, testsCompleted, upcomingTests });
  } catch (error) {
    console.error("[STUDENT_ANALYTICS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

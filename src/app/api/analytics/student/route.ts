import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STUDENT") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    // Get all attempts for this user
    const attempts = await prisma.attempt.findMany({
      where: {
        userId,
        status: { in: ["COMPLETED", "AUTO_SUBMITTED"] }
      }
    });

    const testsCompleted = attempts.length;
    const totalScore = attempts.reduce((acc, attempt) => acc + (attempt.score || 0), 0);
    const averageScore = testsCompleted > 0 ? Math.round(totalScore / testsCompleted) : 0;

    // Get all published tests
    const allTests = await prisma.test.findMany({
      where: { isPublished: true }
    });

    // Find tests the user hasn't attempted yet
    const attemptedTestIds = attempts.map(a => a.testId);
    const upcomingTests = allTests.filter(t => !attemptedTestIds.includes(t.id)).length;

    return NextResponse.json({
      averageScore,
      testsCompleted,
      upcomingTests
    });
  } catch (error) {
    console.error("[STUDENT_ANALYTICS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

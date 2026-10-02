import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MENTOR")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const [totalStudents, totalQuestions, totalTests, totalAttempts] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.question.count(),
      prisma.test.count(),
      prisma.attempt.count({ where: { status: 'COMPLETED' } })
    ]);

    return NextResponse.json({
      totalStudents,
      totalQuestions,
      totalTests,
      totalAttempts
    });
  } catch (error) {
    console.error("[MENTOR_STATS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}



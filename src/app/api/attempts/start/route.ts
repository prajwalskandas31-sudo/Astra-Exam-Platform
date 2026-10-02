import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { testId } = await request.json();
    if (!testId) {
      return NextResponse.json({ error: "Missing testId" }, { status: 400 });
    }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: {
          include: {
            question: true
          }
        }
      }
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Create a new attempt
    const attempt = await prisma.attempt.create({
      data: {
        userId: session.user.id,
        testId: test.id,
        status: "IN_PROGRESS",
        timeRemaining: test.duration * 60, // minutes to seconds
      }
    });

    return NextResponse.json({ attemptId: attempt.id });
  } catch (error) {
    console.error("[ATTEMPT_START_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}



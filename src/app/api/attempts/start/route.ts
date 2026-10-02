import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STUDENT") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { testId } = await request.json();
    if (!testId) {
      return new NextResponse("Missing testId", { status: 400 });
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
      return new NextResponse("Test not found", { status: 404 });
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
    return new NextResponse("Internal Error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STUDENT") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return new NextResponse("Missing reason", { status: 400 });
    }

    const attempt = await prisma.attempt.findUnique({
      where: { id },
    });

    if (!attempt || attempt.userId !== session.user.id) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Log Violation
    await prisma.violation.create({
      data: {
        attemptId: attempt.id,
        type: reason,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VIOLATION_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}



import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import { isFinished } from "@/lib/attempts";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const { reason } = await request.json();
    if (!reason || typeof reason !== "string") {
      return NextResponse.json({ error: "Missing reason" }, { status: 400 });
    }

    const attempt = await prisma.attempt.findUnique({ where: { id } });
    if (!attempt || attempt.userId !== session.user.id) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    if (isFinished(attempt.status)) {
      return NextResponse.json({ error: "Attempt already submitted" }, { status: 409 });
    }

    await prisma.violation.create({
      data: { attemptId: attempt.id, type: reason.slice(0, 100) },
    });
    const count = await prisma.violation.count({ where: { attemptId: attempt.id } });

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("[VIOLATION_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

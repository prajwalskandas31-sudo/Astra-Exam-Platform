import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

export async function GET() {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const attempts = await prisma.attempt.findMany({
      where: { userId: session.user.id },
      include: {
        test: { include: { _count: { select: { questions: true } } } },
        _count: { select: { answers: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(attempts);
  } catch (error) {
    console.error("[ATTEMPTS_HISTORY_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

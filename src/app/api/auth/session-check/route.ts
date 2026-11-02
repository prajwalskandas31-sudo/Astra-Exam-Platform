import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

export async function GET() {
  try {
    const { session, error } = await requireRole();
    if (error) return error;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { sessionId: true, status: true }
    });

    return NextResponse.json({ sessionId: user?.sessionId ?? null, active: !!user && user.status === "APPROVED" });
  } catch {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    let attempts: any[] = [];
    try {
      attempts = await prisma.attempt.findMany({
        where: { userId: session.user.id },
        include: { test: true },
        orderBy: { createdAt: "desc" }
      });
    } catch (e) {}

    return NextResponse.json(attempts);
  } catch (error) {
    console.error("[ATTEMPTS_HISTORY_GET]", error);
    return NextResponse.json([]);
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MENTOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pendingUsers = await prisma.user.findMany({
      where: {
        status: "PENDING",
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json(pendingUsers);
  } catch (error) {
    console.error("[PENDING_USERS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}



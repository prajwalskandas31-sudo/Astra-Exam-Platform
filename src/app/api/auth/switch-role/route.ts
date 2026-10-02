import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { targetRole } = await req.json();

    const validRoles = ["STUDENT", "MENTOR", "PARENT", "ADMIN", "SUPER_ADMIN", "FACULTY"];
    if (!targetRole || !validRoles.includes(targetRole)) {
      return NextResponse.json({ error: "Invalid target role" }, { status: 400 });
    }

    // Update user role in database for current session user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: targetRole }
    });

    return NextResponse.json({
      success: true,
      targetRole,
      message: `Profile role updated to ${targetRole}. Please refresh to view new portal.`
    });
  } catch (error) {
    console.error("[SWITCH_ROLE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}



import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantWhere } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";

export async function GET() {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const pendingUsers = await prisma.user.findMany({
      where: { status: "PENDING", ...tenantWhere(session) },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(pendingUsers);
  } catch (error) {
    console.error("[PENDING_USERS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

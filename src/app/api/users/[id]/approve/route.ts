import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantWhere } from "@/lib/api";
import { STAFF_ROLES, isAdmin } from "@/lib/roles";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const { status } = await request.json();
    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json({ error: "status must be APPROVED or REJECTED" }, { status: 400 });
    }

    const target = await prisma.user.findFirst({ where: { id, ...tenantWhere(session) } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Mentors can approve students and parents; staff accounts need an admin
    if (target.role !== "STUDENT" && target.role !== "PARENT" && !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Only admins can approve staff accounts" }, { status: 403 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, role: true, status: true }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[USER_APPROVE_PUT]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

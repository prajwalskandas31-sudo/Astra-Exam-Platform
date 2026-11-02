import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantWhere } from "@/lib/api";
import { ADMIN_ROLES, ROLES } from "@/lib/roles";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;
    const { id } = await params;

    const target = await prisma.user.findFirst({ where: { id, ...tenantWhere(session) } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Super admin accounts can only be modified by a super admin, whatever the field
    if (target.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only a super admin can manage super admins" }, { status: 403 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.status !== undefined && target.id === session.user.id) {
      return NextResponse.json({ error: "You cannot change your own account status" }, { status: 400 });
    }

    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body.phone === "string") data.phone = body.phone.trim() || null;
    if (body.status === "APPROVED" || body.status === "REJECTED" || body.status === "PENDING") data.status = body.status;
    if (body.batchId === null || typeof body.batchId === "string") {
      if (body.batchId) {
        const batch = await prisma.batch.findFirst({ where: { id: body.batchId, ...tenantWhere(session) } });
        if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 400 });
      }
      data.batchId = body.batchId || null;
    }
    if (typeof body.role === "string" && (ROLES as readonly string[]).includes(body.role)) {
      if (target.id === session.user.id) {
        return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
      }
      if ((body.role === "SUPER_ADMIN" || target.role === "SUPER_ADMIN") && session.user.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Only a super admin can manage super admins" }, { status: 403 });
      }
      data.role = body.role;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, phone: true, role: true, status: true, batchId: true }
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("[USER_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;
    const { id } = await params;

    if (id === session.user.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }
    const target = await prisma.user.findFirst({ where: { id, ...tenantWhere(session) } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only a super admin can remove super admins" }, { status: 403 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[USER_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

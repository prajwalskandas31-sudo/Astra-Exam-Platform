import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantOrGlobalWhere } from "@/lib/api";
import { STAFF_ROLES, isAdmin } from "@/lib/roles";

const AUDIENCES = ["ALL", "STUDENTS", "PARENTS"] as const;

export async function GET() {
  try {
    const { session, error } = await requireRole();
    if (error) return error;

    const role = session.user.role;
    const where: Prisma.AnnouncementWhereInput = { ...tenantOrGlobalWhere(session) };
    if (role === "STUDENT") where.audience = { in: ["ALL", "STUDENTS"] };
    else if (role === "PARENT") where.audience = { in: ["ALL", "PARENTS"] };

    const announcements = await prisma.announcement.findMany({
      where,
      include: { author: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error("[ANNOUNCEMENTS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!title || !text) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.slice(0, 200),
        body: text.slice(0, 5000),
        audience: (AUDIENCES as readonly string[]).includes(body.audience) ? body.audience : "ALL",
        priority: body.priority === "HIGH" ? "HIGH" : "NORMAL",
        authorId: session.user.id,
        organizationId: session.user.organizationId ?? null
      },
      include: { author: { select: { name: true, role: true } } }
    });

    return NextResponse.json(announcement);
  } catch (error) {
    console.error("[ANNOUNCEMENTS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const existing = await prisma.announcement.findUnique({ where: { id } });
    // Authors can delete their own posts; admins can moderate their institute's posts
    const canDelete = existing && (existing.authorId === session.user.id ||
      (isAdmin(session.user.role) &&
        (session.user.role === "SUPER_ADMIN" || existing.organizationId === session.user.organizationId)));
    if (!canDelete) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.announcement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ANNOUNCEMENTS_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantWhere } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;
    const { id } = await params;

    const existing = await prisma.test.findFirst({ where: { id, ownerId: null, ...tenantWhere(session) } });
    if (!existing) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
    if (typeof body.description === "string") data.description = body.description.trim() || null;
    if (body.duration !== undefined) {
      const d = Number(body.duration);
      if (!Number.isInteger(d) || d < 1 || d > 600) return NextResponse.json({ error: "Duration must be 1-600 minutes" }, { status: 400 });
      data.duration = d;
    }
    if (body.type === "MOCK" || body.type === "PRACTICE") data.type = body.type;
    if (body.mode === "CBT" || body.mode === "OMR") data.mode = body.mode;
    if (typeof body.isPublished === "boolean") {
      if (body.isPublished) {
        const count = await prisma.testQuestion.count({ where: { testId: id } });
        if (count === 0) return NextResponse.json({ error: "Add questions before publishing" }, { status: 400 });
      }
      data.isPublished = body.isPublished;
      data.status = body.isPublished ? "ACTIVE" : "DRAFT";
    }

    const test = await prisma.test.update({ where: { id }, data });
    return NextResponse.json(test);
  } catch (error) {
    console.error("[TEST_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;
    const { id } = await params;

    const existing = await prisma.test.findFirst({
      where: { id, ownerId: null, ...tenantWhere(session) },
      include: { _count: { select: { attempts: true } } }
    });
    if (!existing) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    if (existing._count.attempts > 0) {
      // Preserve student results: archive instead of deleting
      await prisma.test.update({ where: { id }, data: { isPublished: false, status: "ARCHIVED" } });
      return NextResponse.json({ success: true, archived: true });
    }

    await prisma.test.delete({ where: { id } });
    return NextResponse.json({ success: true, archived: false });
  } catch (error) {
    console.error("[TEST_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

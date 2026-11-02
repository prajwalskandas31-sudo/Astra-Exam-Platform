import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantWhere } from "@/lib/api";
import { ADMIN_ROLES, STAFF_ROLES } from "@/lib/roles";

export async function GET() {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const batches = await prisma.batch.findMany({
      where: tenantWhere(session),
      include: {
        users: {
          where: { role: "STUDENT" },
          select: { id: true, attempts: { where: { status: { in: ["COMPLETED", "AUTO_SUBMITTED"] } }, select: { percentage: true } } }
        },
        _count: { select: { tests: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(
      batches.map(({ users, _count, ...b }) => {
        const scores = users.flatMap((u) => u.attempts.map((a) => a.percentage || 0));
        return {
          ...b,
          studentCount: users.length,
          testCount: _count.tests,
          attemptCount: scores.length,
          avgPercentage: scores.length ? Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 10) / 10 : null
        };
      })
    );
  } catch (error) {
    console.error("[BATCHES_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;

    const { name } = await request.json();
    const clean = typeof name === "string" ? name.trim().slice(0, 100) : "";
    if (!clean) return NextResponse.json({ error: "Batch name is required" }, { status: 400 });

    const organizationId = session.user.organizationId ?? null;
    const dup = await prisma.batch.findFirst({ where: { name: clean, organizationId } });
    if (dup) return NextResponse.json({ error: "A batch with this name already exists" }, { status: 409 });

    const batch = await prisma.batch.create({ data: { name: clean, organizationId } });
    return NextResponse.json(batch);
  } catch (error) {
    console.error("[BATCHES_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const batch = await prisma.batch.findFirst({ where: { id, ...tenantWhere(session) } });
    if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

    // Students keep their accounts; their batch is cleared (onDelete: SetNull)
    await prisma.batch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BATCHES_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

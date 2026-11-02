import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantWhere } from "@/lib/api";
import { ADMIN_ROLES, ROLES, STAFF_ROLES, type AppRole } from "@/lib/roles";

export async function GET(request: Request) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role");
    const role = roleParam && (ROLES as readonly string[]).includes(roleParam) ? (roleParam as AppRole) : undefined;
    // Mentors only see students; admins can list everyone (default: students)
    const isAdminCaller = (ADMIN_ROLES as readonly string[]).includes(session.user.role);
    const roleFilter = isAdminCaller
      ? role ? { role } : searchParams.get("scope") === "all" ? {} : { role: "STUDENT" as const }
      : { role: "STUDENT" as const, status: "APPROVED" as const };
    const where = { ...tenantWhere(session), ...roleFilter };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        batchId: true,
        batch: { select: { name: true } },
        attempts: { where: { status: { in: ["COMPLETED", "AUTO_SUBMITTED"] } }, select: { percentage: true } },
        _count: { select: { parentLinks: true, studentLinks: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(
      users.map(({ attempts, batch, _count, ...u }) => ({
        ...u,
        batch: batch?.name || "Unassigned",
        linkedCount: u.role === "PARENT" ? _count.parentLinks : _count.studentLinks,
        testsCompleted: attempts.length,
        averageScore: attempts.length > 0
          ? Math.round(attempts.reduce((acc, a) => acc + (a.percentage || 0), 0) / attempts.length)
          : 0
      }))
    );
  } catch (error) {
    console.error("[USERS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/** Admin-created accounts (any role except SUPER_ADMIN, which only a super admin may grant). */
export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = (ROLES as readonly string[]).includes(body.role) ? (body.role as AppRole) : "STUDENT";

    if (!name || !email || password.length < 8) {
      return NextResponse.json({ error: "Name, email and a password of at least 8 characters are required" }, { status: 400 });
    }
    if (role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only a super admin can create super admins" }, { status: 403 });
    }
    if (await prisma.user.findUnique({ where: { email } })) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    let batchId: string | null = null;
    if (typeof body.batchId === "string" && body.batchId) {
      const batch = await prisma.batch.findFirst({ where: { id: body.batchId, ...tenantWhere(session) } });
      if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 400 });
      batchId = batch.id;
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
        password: await bcrypt.hash(password, 10),
        role,
        status: "APPROVED",
        organizationId: session.user.organizationId ?? null,
        batchId
      },
      select: { id: true, name: true, email: true, role: true, status: true }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("[USERS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

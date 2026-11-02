import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantWhere } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";

export async function GET() {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    // Explicit select: never send password hashes or session ids to the client
    const students = await prisma.user.findMany({
      where: { role: "STUDENT", status: "APPROVED", ...tenantWhere(session) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        batch: { select: { id: true, name: true } },
        studentLinks: { select: { parent: { select: { id: true, name: true, phone: true, email: true } } } },
        attempts: {
          include: { test: { select: { id: true, title: true, totalMarks: true, type: true, mode: true } } },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("[MENTOR_STUDENTS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

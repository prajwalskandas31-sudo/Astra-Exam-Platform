import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantOrGlobalWhere } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";

export async function GET() {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const templates = await prisma.examTemplate.findMany({
      where: tenantOrGlobalWhere(session),
      select: { id: true, name: true, examCategory: true, mode: true, totalDuration: true, hasNegativeMarking: true },
      orderBy: { name: "asc" }
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("[TEMPLATES_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

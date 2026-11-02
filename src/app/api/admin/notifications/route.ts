import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, safeJson, tenantWhere } from "@/lib/api";
import { ADMIN_ROLES } from "@/lib/roles";

export async function GET() {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;

    const logs = await prisma.notificationLog.findMany({ where: tenantWhere(session), orderBy: { createdAt: "desc" }, take: 200 });
    return NextResponse.json(
      logs.map((l) => ({ ...l, payload: safeJson<Record<string, unknown>>(l.payload, {}) }))
    );
  } catch (error) {
    console.error("[ADMIN_NOTIFICATIONS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

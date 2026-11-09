import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantWhere } from "@/lib/api";
import { ADMIN_ROLES } from "@/lib/roles";

const PAGE = 50;

/** GET ?before=<ISO date>&area=user|test|question|... — newest first, 50 per page. */
export async function GET(request: Request) {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;
    const url = new URL(request.url);
    const before = url.searchParams.get("before");
    const area = url.searchParams.get("area");

    const rows = await prisma.auditLog.findMany({
      where: {
        ...tenantWhere(session),
        ...(before && !Number.isNaN(Date.parse(before)) ? { createdAt: { lt: new Date(before) } } : {}),
        ...(area && /^[a-zA-Z]+$/.test(area) ? { action: { startsWith: `${area}.` } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: PAGE + 1,
      select: { id: true, actorName: true, actorRole: true, action: true, targetType: true, summary: true, ip: true, createdAt: true },
    });
    const hasMore = rows.length > PAGE;
    const items = rows.slice(0, PAGE);
    return NextResponse.json({ items, nextBefore: hasMore ? items[items.length - 1].createdAt : null });
  } catch (error) {
    console.error("[AUDIT_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

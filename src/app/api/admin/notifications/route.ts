import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, safeJson, tenantWhere } from "@/lib/api";
import { ADMIN_ROLES } from "@/lib/roles";
import { retryNotification } from "@/lib/messaging";

/** Admin: delivery log. ?status=DELIVERED,READ (comma-separated) &type=RESULT|… */
export async function GET(request: Request) {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;

    const params = new URL(request.url).searchParams;
    const where: Prisma.NotificationLogWhereInput = { ...tenantWhere(session) };
    const status = params.get("status");
    const type = params.get("type");
    if (status) where.status = { in: status.split(",") };
    if (type) where.type = type;

    const [logs, counts] = await Promise.all([
      prisma.notificationLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 300 }),
      prisma.notificationLog.groupBy({ by: ["status"], where: tenantWhere(session), _count: true }),
    ]);
    return NextResponse.json({
      logs: logs.map((l) => ({ ...l, payload: safeJson<Record<string, unknown>>(l.payload, {}) })),
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
    });
  } catch (error) {
    console.error("[ADMIN_NOTIFICATIONS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/** Admin: retry failed/skipped messages. Body: { ids: string[] } (max 100). */
export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;

    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) return jsonError("Select between 1 and 100 messages");

    const orgId = session.user.role === "SUPER_ADMIN" ? undefined : session.user.organizationId ?? null;
    const results = [];
    for (const id of ids.filter((x: unknown): x is string => typeof x === "string")) {
      results.push({ id, ...(await retryNotification(id, orgId)) });
    }
    return NextResponse.json({ sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
  } catch (error) {
    console.error("[ADMIN_NOTIFICATIONS_RETRY]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

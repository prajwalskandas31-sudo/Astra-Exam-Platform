import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, tenantOrGlobalWhere } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";
import { appBaseUrl } from "@/lib/reportLinks";
import { sendResult, type Audience } from "@/lib/messaging/automations";

/**
 * Staff: send report cards for every student who took this test (their best first attempt).
 * Body: { audience: "PARENTS" | "STUDENT" | "BOTH" }. Runs in the background; progress shows in Notification Logs.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;
    const { id } = await params;

    const { audience = "PARENTS" } = await request.json().catch(() => ({}));
    if (!["PARENTS", "STUDENT", "BOTH"].includes(audience)) return jsonError("Invalid audience");

    const test = await prisma.test.findFirst({ where: { id, ownerId: null, ...tenantOrGlobalWhere(session) }, select: { id: true } });
    if (!test) return jsonError("Test not found", 404);

    const userScope = session.user.role === "SUPER_ADMIN" ? {} : { organizationId: session.user.organizationId ?? "__none__" };
    const attempts = await prisma.attempt.findMany({
      where: { testId: id, isRetry: false, status: { in: ["COMPLETED", "AUTO_SUBMITTED"] }, user: userScope },
      select: { id: true, userId: true, score: true },
    });
    const best = new Map<string, { id: string; score: number | null }>();
    for (const a of attempts) {
      const cur = best.get(a.userId);
      if (!cur || (a.score ?? 0) > (cur.score ?? 0)) best.set(a.userId, a);
    }
    if (best.size === 0) return jsonError("No submissions to report yet");

    const baseUrl = appBaseUrl(request);
    const ids = [...best.values()].map((a) => a.id);
    after(async () => {
      for (const attemptId of ids) {
        await sendResult(attemptId, baseUrl, audience as Audience).catch((e) => console.error("[BULK_REPORTS]", attemptId, e));
      }
    });

    return NextResponse.json({ queued: ids.length, message: `Sending ${ids.length} report card${ids.length === 1 ? "" : "s"} — check Notification Logs for delivery` });
  } catch (error) {
    console.error("[DISPATCH_REPORTS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

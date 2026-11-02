import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";
import { canViewAttempt, isFinished } from "@/lib/attempts";
import { appBaseUrl } from "@/lib/reportLinks";
import { sendResult, type Audience } from "@/lib/messaging/automations";

/** Staff: (re)send one attempt's report card. Body: { attemptId, audience?: "PARENTS" | "STUDENT" | "BOTH" } */
export async function POST(req: Request) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const { attemptId, audience = "BOTH" } = await req.json();
    if (typeof attemptId !== "string" || !attemptId) return jsonError("attemptId is required");
    if (!["PARENTS", "STUDENT", "BOTH"].includes(audience)) return jsonError("Invalid audience");

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { user: { select: { name: true, organizationId: true } }, test: { select: { title: true } } },
    });
    if (!attempt || !(await canViewAttempt(session, attempt))) return jsonError("Attempt not found", 404);
    if (!isFinished(attempt.status)) return jsonError("This attempt hasn't been submitted yet");

    const result = await sendResult(attempt.id, appBaseUrl(req), audience as Audience);
    if (result.recipients === 0) {
      return jsonError(audience === "PARENTS" ? "No parent is linked to this student yet" : "reason" in result ? String(result.reason) : "Nobody to send to");
    }

    return NextResponse.json({
      success: true,
      reportUrl: "link" in result ? result.link : null,
      recipients: result.recipients,
      sent: result.sent,
      studentName: attempt.user.name,
      testTitle: attempt.test.title,
      message: result.sent > 0
        ? `Report accepted for delivery to ${result.sent} of ${result.recipients} recipient${result.recipients === 1 ? "" : "s"} — delivery is confirmed in Notification Logs`
        : `Report link created, but nothing was delivered — check Notification Logs for the reason`,
    });
  } catch (error) {
    console.error("[DISPATCH_REPORT_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, tenantWhere } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";

/** Staff: resolve or dismiss a report. Body: { status: "RESOLVED" | "DISMISSED" | "OPEN", resolution? } */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;
    const { id } = await params;

    const report = await prisma.questionReport.findFirst({ where: { id, ...tenantWhere(session) } });
    if (!report) return jsonError("Report not found", 404);

    const body = await request.json();
    if (!["RESOLVED", "DISMISSED", "OPEN"].includes(body.status)) return jsonError("Invalid status");
    const resolution = typeof body.resolution === "string" ? body.resolution.trim().slice(0, 1000) || null : null;

    const reopening = body.status === "OPEN";
    // Closing one report also closes every other open report on the same question
    const { count } = await prisma.questionReport.updateMany({
      where: reopening ? { id } : { OR: [{ id }, { questionId: report.questionId, status: "OPEN", ...tenantWhere(session) }] },
      data: { status: body.status, resolution, resolvedAt: reopening ? null : new Date() },
    });

    return NextResponse.json({ success: true, updated: count });
  } catch (error) {
    console.error("[QUESTION_REPORT_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, tenantOrGlobalWhere, tenantWhere } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";

const REPORT_REASONS =["WRONG_ANSWER", "TYPO", "UNCLEAR", "OUTDATED", "OTHER"] as const;

/** Staff: question error reports for their institute. ?status=OPEN|RESOLVED|DISMISSED */
export async function GET(request: Request) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const status = new URL(request.url).searchParams.get("status");
    const reports = await prisma.questionReport.findMany({
      where: { ...tenantWhere(session), ...(status ? { status } : {}) },
      include: {
        user: { select: { name: true, email: true } },
        question: {
          select: {
            id: true, text: true, options: true, correctOption: true, explanation: true,
            subject: true, topic: true, questionType: true, organizationId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const counts = await prisma.questionReport.groupBy({ by: ["status"], where: tenantWhere(session), _count: true });

    return NextResponse.json({
      reports: reports.map((r) => ({
        ...r,
        // Global (platform) questions can't be edited by an institute
        canEdit: session.user.role === "SUPER_ADMIN" || r.question.organizationId === session.user.organizationId,
      })),
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
    });
  } catch (error) {
    console.error("[QUESTION_REPORTS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/** Student: flag a question. Body: { questionId, reason, details? } */
export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const body = await request.json();
    const reason = typeof body.reason === "string" ? body.reason : "";
    if (!(REPORT_REASONS as readonly string[]).includes(reason)) return jsonError("Pick a reason");
    const details = typeof body.details === "string" ? body.details.trim().slice(0, 1000) || null : null;
    if (reason === "OTHER" && !details) return jsonError("Please describe the problem");

    const question = typeof body.questionId === "string"
      ? await prisma.question.findFirst({ where: { id: body.questionId, ...tenantOrGlobalWhere(session) }, select: { id: true } })
      : null;
    if (!question) return jsonError("Question not found", 404);

    const existing = await prisma.questionReport.findFirst({
      where: { questionId: question.id, userId: session.user.id, status: "OPEN" },
    });
    if (existing) return jsonError("You've already reported this question — faculty will review it soon.", 409);

    await prisma.questionReport.create({
      data: {
        questionId: question.id,
        userId: session.user.id,
        reason,
        details,
        organizationId: session.user.organizationId ?? null,
      },
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[QUESTION_REPORTS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

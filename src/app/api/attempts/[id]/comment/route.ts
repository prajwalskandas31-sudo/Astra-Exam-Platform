import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";
import { canViewAttempt } from "@/lib/attempts";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;
    const { id } = await params;

    const { comment } = await request.json();
    if (typeof comment !== "string") {
      return NextResponse.json({ error: "comment must be a string" }, { status: 400 });
    }

    const existing = await prisma.attempt.findUnique({ where: { id }, include: { user: { select: { organizationId: true } } } });
    if (!existing || !(await canViewAttempt(session, existing))) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const attempt = await prisma.attempt.update({
      where: { id },
      data: { mentorComment: comment.trim().slice(0, 4000) || null }
    });

    return NextResponse.json(attempt);
  } catch (error) {
    console.error("[ATTEMPT_COMMENT_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

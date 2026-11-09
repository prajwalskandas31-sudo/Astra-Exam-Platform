import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantWhere } from "@/lib/api";
import { audit } from "@/lib/audit";
import { STAFF_ROLES } from "@/lib/roles";
import { normalizeQuestion } from "@/lib/questions";

async function findOwnQuestion(id: string, session: Parameters<typeof tenantWhere>[0]) {
  // Staff may only modify their own institute's questions (global ones are read-only)
  return prisma.question.findFirst({ where: { id, ...tenantWhere(session) } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;
    const { id } = await params;

    const existing = await findOwnQuestion(id, session);
    if (!existing) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const body = await request.json();
    // Merge partial updates over the stored question, then re-validate the whole thing
    const { data, error: validationError } = normalizeQuestion({ ...existing, ...body });
    if (!data) return NextResponse.json({ error: validationError }, { status: 400 });

    const updated = await prisma.question.update({ where: { id }, data });
    await audit(session, { action: "question.update", targetType: "Question", targetId: id, summary: `Edited a ${updated.subject} question${existing.correctOption !== updated.correctOption ? " (answer key changed)" : ""}` }, request);
    return NextResponse.json({ success: true, question: updated });
  } catch (error) {
    console.error("[QUESTION_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;
    const { id } = await params;

    const existing = await findOwnQuestion(id, session);
    if (!existing) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }
    const answered = await prisma.answer.count({ where: { questionId: id, selectedOpt: { not: null } } });
    if (answered > 0) {
      // Keep history intact: retire the question instead of deleting graded answers
      await prisma.question.update({ where: { id }, data: { status: "DRAFT" } });
      await audit(session, { action: "question.archive", targetType: "Question", targetId: id, summary: "Retired a question that students had answered" }, _request);
      return NextResponse.json({ success: true, archived: true });
    }

    await prisma.question.delete({ where: { id } });
    await audit(session, { action: "question.delete", targetType: "Question", targetId: id, summary: `Deleted a ${existing.subject} question` }, _request);
    return NextResponse.json({ success: true, archived: false });
  } catch (error) {
    console.error("[QUESTION_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import { audit } from "@/lib/audit";
import { STAFF_ROLES } from "@/lib/roles";
import { normalizeQuestion } from "@/lib/questions";

const MAX_BULK = 1000;

export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const body = await request.json();
    const rows: unknown[] | null = Array.isArray(body) ? body : Array.isArray(body?.questions) ? body.questions : null;
    const sourceFile: string | null = !Array.isArray(body) && typeof body?.sourceFile === "string" ? body.sourceFile : null;

    if (!rows) {
      return NextResponse.json({ error: "Invalid JSON format. Expected an array of questions." }, { status: 400 });
    }
    if (rows.length === 0 || rows.length > MAX_BULK) {
      return NextResponse.json({ error: `Upload between 1 and ${MAX_BULK} questions at a time` }, { status: 400 });
    }

    const valid: Prisma.QuestionUncheckedCreateInput[] = [];
    const errors: string[] = [];
    rows.forEach((row, i) => {
      const { data, error: rowError } = normalizeQuestion((row ?? {}) as Record<string, unknown>);
      if (data) {
        const rowSource = typeof (row as { sourceFile?: unknown }).sourceFile === "string" ? (row as { sourceFile: string }).sourceFile : null;
        valid.push({ ...data, sourceFile: rowSource || sourceFile, organizationId: session.user.organizationId ?? null });
      } else {
        errors.push(`Row ${i + 1}: ${rowError}`);
      }
    });

    if (valid.length === 0) {
      return NextResponse.json({ error: "No valid questions found", details: errors.slice(0, 20) }, { status: 400 });
    }

    const created = await prisma.$transaction(valid.map((data) => prisma.question.create({ data })));

    await audit(session, { action: "question.import", targetType: "Question", summary: `Imported ${created.length} questions${errors.length ? `, skipped ${errors.length}` : ""}` }, request);
    return NextResponse.json({ success: true, count: created.length, skipped: errors.length, details: errors.slice(0, 20) });
  } catch (error) {
    console.error("[QUESTIONS_BULK_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

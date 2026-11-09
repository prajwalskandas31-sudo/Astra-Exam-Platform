import crypto from "crypto";
// Native bcrypt: runs on the libuv thread pool, so a login rush does not block the event loop
import * as bcrypt from "@node-rs/bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole } from "@/lib/api";
import { audit } from "@/lib/audit";
import { ADMIN_ROLES } from "@/lib/roles";

const MAX_ROWS = 2000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const tempPassword = () => Array.from(crypto.randomBytes(10), (b) => ALPHABET[b % ALPHABET.length]).join("");

interface Row {
  name?: string;
  email?: string;
  phone?: string;
  batch?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
}

interface RowResult {
  row: number;
  email: string;
  status: "created" | "updated" | "error";
  message?: string;
  parent?: "created" | "linked" | "error";
}

const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Admin: bulk-create students (and their parents) for this institute.
 * Body: { rows: Row[], dryRun?: boolean }. Existing students are updated (phone, batch);
 * parents are matched by email or created, then linked. New accounts get a one-time password
 * returned in `credentials` — it is not stored anywhere in plain text.
 */
export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;
    const orgId = session.user.organizationId;
    if (!orgId) return jsonError("Sign in as an institute admin to import users");

    const { rows, dryRun = false } = (await request.json()) as { rows?: Row[]; dryRun?: boolean };
    if (!Array.isArray(rows) || rows.length === 0) return jsonError("No rows to import");
    if (rows.length > MAX_ROWS) return jsonError(`Import at most ${MAX_ROWS} rows at a time`);

    // Pre-load everything the rows refer to, so validation is one pass
    const emails = new Set<string>();
    for (const r of rows) {
      if (r.email) emails.add(clean(r.email).toLowerCase());
      if (r.parentEmail) emails.add(clean(r.parentEmail).toLowerCase());
    }
    const existing = new Map(
      (await prisma.user.findMany({ where: { email: { in: [...emails] } }, select: { id: true, email: true, role: true, organizationId: true } }))
        .map((u) => [u.email, u])
    );
    const batches = new Map((await prisma.batch.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } })).map((b) => [b.name.toLowerCase(), b]));

    const results: RowResult[] = [];
    const credentials: { name: string; email: string; role: string; password: string }[] = [];
    const seen = new Set<string>();
    const newBatches = new Set<string>();
    const plannedParents = new Set<string>(); // dry run: parents an earlier row would already create

    for (const [i, raw] of rows.entries()) {
      const rowNo = i + 2; // +1 for 1-based, +1 for the header line in the CSV
      const name = clean(raw.name, 100);
      const email = clean(raw.email).toLowerCase();
      const parentEmail = clean(raw.parentEmail).toLowerCase();
      const fail = (message: string) => results.push({ row: rowNo, email, status: "error", message });

      if (!name || !EMAIL.test(email)) { fail("Name and a valid email are required"); continue; }
      if (seen.has(email)) { fail("Duplicate email in this file"); continue; }
      seen.add(email);

      const student = existing.get(email);
      if (student && (student.organizationId !== orgId || student.role !== "STUDENT")) {
        fail("This email belongs to an account that isn't a student of this institute"); continue;
      }
      if (parentEmail && !EMAIL.test(parentEmail)) { fail("Parent email is not valid"); continue; }
      if (parentEmail === email) { fail("Parent and student emails must differ"); continue; }
      const parent = parentEmail ? existing.get(parentEmail) : undefined;
      if (parent && (parent.organizationId !== orgId || parent.role !== "PARENT")) {
        fail("Parent email belongs to an account that isn't a parent of this institute"); continue;
      }

      const batchName = clean(raw.batch, 100);
      if (batchName && !batches.has(batchName.toLowerCase())) newBatches.add(batchName);

      if (dryRun) {
        const parentPlan = !parentEmail ? undefined : parent || plannedParents.has(parentEmail) ? "linked" : "created";
        if (parentEmail) plannedParents.add(parentEmail);
        results.push({ row: rowNo, email, status: student ? "updated" : "created", parent: parentPlan });
        continue;
      }

      try {
        let batchId: string | null | undefined = undefined;
        if (batchName) {
          let b = batches.get(batchName.toLowerCase());
          if (!b) {
            b = await prisma.batch.create({ data: { name: batchName, organizationId: orgId }, select: { id: true, name: true } });
            batches.set(batchName.toLowerCase(), b);
          }
          batchId = b.id;
        }

        let studentId: string;
        if (student) {
          await prisma.user.update({
            where: { id: student.id },
            data: { ...(clean(raw.phone) ? { phone: clean(raw.phone, 30) } : {}), ...(batchId ? { batchId } : {}) },
          });
          studentId = student.id;
        } else {
          const password = tempPassword();
          const created = await prisma.user.create({
            data: { name, email, phone: clean(raw.phone, 30) || null, password: await bcrypt.hash(password, 10), role: "STUDENT", status: "APPROVED", organizationId: orgId, batchId: batchId ?? null },
            select: { id: true, email: true, role: true, organizationId: true },
          });
          existing.set(email, created);
          credentials.push({ name, email, role: "STUDENT", password });
          studentId = created.id;
        }

        let parentOutcome: RowResult["parent"];
        if (parentEmail) {
          let parentId = parent?.id ?? existing.get(parentEmail)?.id;
          if (!parentId) {
            const password = tempPassword();
            const p = await prisma.user.create({
              data: { name: clean(raw.parentName, 100) || `Parent of ${name}`, email: parentEmail, phone: clean(raw.parentPhone, 30) || null, password: await bcrypt.hash(password, 10), role: "PARENT", status: "APPROVED", organizationId: orgId },
              select: { id: true, email: true, role: true, organizationId: true },
            });
            existing.set(parentEmail, p); // siblings in later rows link to the same parent
            credentials.push({ name: clean(raw.parentName, 100) || `Parent of ${name}`, email: parentEmail, role: "PARENT", password });
            parentId = p.id;
            parentOutcome = "created";
          } else {
            if (clean(raw.parentPhone)) await prisma.user.update({ where: { id: parentId }, data: { phone: clean(raw.parentPhone, 30) } });
            parentOutcome = "linked";
          }
          await prisma.parentStudentLink.upsert({
            where: { parentId_studentId: { parentId, studentId } },
            create: { parentId, studentId },
            update: {},
          });
        }
        results.push({ row: rowNo, email, status: student ? "updated" : "created", parent: parentOutcome });
      } catch (e) {
        console.error("[USERS_IMPORT_ROW]", rowNo, e);
        fail("Couldn't save this row");
      }
    }

    if (!dryRun) {
      await audit(session, { action: "user.import", targetType: "User", summary: `CSV import: ${results.filter((r) => r.status === "created").length} created, ${results.filter((r) => r.status === "updated").length} updated, ${results.filter((r) => r.status === "error").length} errors` }, request);
    }
    return NextResponse.json({
      dryRun,
      summary: {
        created: results.filter((r) => r.status === "created").length,
        updated: results.filter((r) => r.status === "updated").length,
        errors: results.filter((r) => r.status === "error").length,
        parentsCreated: results.filter((r) => r.parent === "created").length,
        parentsLinked: results.filter((r) => r.parent === "linked").length,
        newBatches: [...newBatches],
      },
      results,
      credentials,
    });
  } catch (error) {
    console.error("[USERS_IMPORT]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

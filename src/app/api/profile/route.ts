import { NextResponse } from "next/server";
// Native bcrypt: runs on the libuv thread pool, so a login rush does not block the event loop
import * as bcrypt from "@node-rs/bcrypt";
import { prisma } from "@/lib/prisma";
import { requireRole, safeJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";

export async function GET() {
  try {
    const { session, error } = await requireRole();
    if (error) return error;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, email: true, phone: true, role: true, createdAt: true, examTracks: true, notifyWhatsapp: true, notifySms: true,
        organization: { select: { name: true } },
        batch: { select: { name: true } }
      }
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ...user, examTracks: safeJson<string[]>(user.examTracks, []) });
  } catch (error) {
    console.error("[PROFILE_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/**
 * Delete my account (DPDP Act right to erasure). Body: { password }. Removes the account and,
 * through cascades, its attempts, answers, bookmarks, review queue and parent links.
 * The last admin of an institute can't delete themselves, so an institute is never left unmanaged.
 */
export async function DELETE(request: Request) {
  try {
    const { session, error } = await requireRole();
    if (error) return error;
    const limited = await rateLimit(`delete-account:${session.user.id}`, 5, 60 * 60);
    if (!limited.ok) return tooManyRequests(limited.retryAfter);

    const body = await request.json().catch(() => null);
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, role: true, password: true, organizationId: true } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (typeof body?.password !== "string" || !(await bcrypt.compare(body.password, user.password))) {
      return NextResponse.json({ error: "Password is incorrect" }, { status: 400 });
    }
    if (user.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Super admin accounts must be removed by another super admin" }, { status: 400 });
    }
    if (user.role === "INSTITUTE_ADMIN" && user.organizationId) {
      const admins = await prisma.user.count({ where: { organizationId: user.organizationId, role: "INSTITUTE_ADMIN", status: "APPROVED" } });
      if (admins <= 1) {
        return NextResponse.json({ error: "You are your institute's only admin. Make someone else an admin first." }, { status: 400 });
      }
    }

    // Recorded first: once the account is gone, the log line keeps the "who" and "when"
    await audit(session, { action: "account.delete", targetType: "User", targetId: user.id, summary: `${user.role.toLowerCase()} ${user.email} deleted their own account` }, request);
    await prisma.user.delete({ where: { id: user.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PROFILE_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { session, error } = await requireRole();
    if (error) return error;

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (typeof body.name === "string") {
      if (!body.name.trim()) return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
      data.name = body.name.trim().slice(0, 100);
    }
    if (typeof body.phone === "string") data.phone = body.phone.trim().slice(0, 30) || null;
    if (typeof body.notifyWhatsapp === "boolean") data.notifyWhatsapp = body.notifyWhatsapp;
    if (typeof body.notifySms === "boolean") data.notifySms = body.notifySms;

    if (body.newPassword !== undefined) {
      if (typeof body.newPassword !== "string" || body.newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
      }
      const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } });
      const ok = user && typeof body.currentPassword === "string" && (await bcrypt.compare(body.currentPassword, user.password));
      if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      data.password = await bcrypt.hash(body.newPassword, 10);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { id: true, name: true, email: true, phone: true }
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PROFILE_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

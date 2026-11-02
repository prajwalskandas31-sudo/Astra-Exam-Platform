import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, tenantWhere } from "@/lib/api";
import { ADMIN_ROLES } from "@/lib/roles";

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Admin: replace a user's password with a temporary one, shown once, and sign them out everywhere. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;
    const { id } = await params;

    const target = await prisma.user.findFirst({ where: { id, ...tenantWhere(session) }, select: { id: true, role: true, email: true } });
    if (!target) return jsonError("User not found", 404);
    if (target.id === session.user.id) return jsonError("Change your own password from Settings");
    if (target.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") return jsonError("Only a super admin can reset a super admin", 403);

    const temporaryPassword = Array.from(crypto.randomBytes(10), (b) => ALPHABET[b % ALPHABET.length]).join("");
    await prisma.user.update({
      where: { id: target.id },
      data: { password: await bcrypt.hash(temporaryPassword, 10), sessionId: crypto.randomUUID() },
    });
    return NextResponse.json({ email: target.email, temporaryPassword });
  } catch (error) {
    console.error("[USER_RESET_PASSWORD]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

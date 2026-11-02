import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { notify } from "@/lib/messaging";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODES_PER_HOUR = 3;
const MAX_GUESSES = 5;

// Same answer whether or not the account exists, so emails can't be probed
const GENERIC = {
  message: "If an account with a phone number exists for this email, a 6-digit code has been sent to it by WhatsApp or SMS.",
};

/** Step 1 — Body: { email }. Sends a one-time code to the account's registered phone. */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (typeof email !== "string" || !email.includes("@")) return jsonError("Enter your account email");

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, name: true, phone: true, organizationId: true, status: true },
    });
    if (!user || !user.phone || user.status !== "APPROVED") return NextResponse.json(GENERIC);

    const recent = await prisma.passwordReset.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
    if (recent >= MAX_CODES_PER_HOUR) return jsonError("Too many codes requested. Please wait an hour and try again.", 429);

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    await prisma.passwordReset.create({
      data: { userId: user.id, codeHash: await bcrypt.hash(code, 10), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    });
    // Security codes go out even if the user muted result notifications
    await notify(
      { userId: user.id, name: user.name, phone: user.phone },
      { organizationId: user.organizationId, kind: "PASSWORD_RESET", variables: [code], essential: true }
    );
    return NextResponse.json(GENERIC);
  } catch (error) {
    console.error("[FORGOT_PASSWORD]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/** Step 2 — Body: { email, code, newPassword }. Verifies the latest code and sets the new password. */
export async function PUT(request: Request) {
  try {
    const { email, code, newPassword } = await request.json();
    if (typeof newPassword !== "string" || newPassword.length < 8) return jsonError("New password must be at least 8 characters");
    if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) return jsonError("Enter the 6-digit code");

    const invalid = jsonError("That code is invalid or has expired. Request a new one.");
    const user = typeof email === "string" ? await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } }) : null;
    if (!user) return invalid;

    const reset = await prisma.passwordReset.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!reset || reset.attempts >= MAX_GUESSES) return invalid;

    if (!(await bcrypt.compare(code.trim(), reset.codeHash))) {
      await prisma.passwordReset.update({ where: { id: reset.id }, data: { attempts: { increment: 1 } } });
      return invalid;
    }

    await prisma.$transaction([
      // A new sessionId no device holds signs out every existing session (see SessionGuard)
      prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 10), sessionId: crypto.randomUUID() } }),
      prisma.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RESET_PASSWORD]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

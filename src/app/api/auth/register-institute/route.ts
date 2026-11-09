import { NextResponse } from "next/server";
import * as bcrypt from "@node-rs/bcrypt";
import { prisma } from "@/lib/prisma";
import { generateJoinCode, uniqueSlug } from "@/lib/institutes";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Public, self-serve: a coaching institute signs itself up.
 * Body: { instituteName, city?, name, email, phone, password, examCategories?: string[] }.
 * Creates the institute (with a join code for its students) and its first admin, who can sign in at once.
 */
export async function POST(request: Request) {
  try {
    const limited = await rateLimit(`register-institute:ip:${clientIp(request.headers)}`, 10, 60 * 60);
    if (!limited.ok) return tooManyRequests(limited.retryAfter, "Too many institute sign-ups from this network. Please try again later.");

    const body = await request.json().catch(() => ({}));
    const instituteName = str(body.instituteName, 100);
    const name = str(body.name, 100);
    const email = str(body.email, 200).toLowerCase();
    const phone = str(body.phone, 30);
    const password = typeof body.password === "string" ? body.password : "";
    const categories = Array.isArray(body.examCategories)
      ? body.examCategories.filter((c: unknown): c is string => typeof c === "string" && c.length <= 30).slice(0, 12)
      : [];

    if (instituteName.length < 2) return NextResponse.json({ error: "Enter your institute's name" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Enter your name" }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    if (!/^\+?[0-9 -]{8,20}$/.test(phone)) return NextResponse.json({ error: "Enter a valid mobile number" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      return NextResponse.json({ error: "An account with this email already exists. Sign in instead." }, { status: 409 });
    }

    const slug = await uniqueSlug(instituteName);
    const passwordHash = await bcrypt.hash(password, 10);
    const org = await prisma.organization.create({
      data: {
        name: instituteName,
        slug,
        contactEmail: email,
        contactPhone: phone,
        joinCode: generateJoinCode(),
        offeredCategories: categories.length ? JSON.stringify(categories) : null,
        users: {
          create: { name, email, phone, password: passwordHash, role: "INSTITUTE_ADMIN", status: "APPROVED" },
        },
      },
      select: { id: true, slug: true },
    });

    return NextResponse.json({ success: true, organization: org });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists. Sign in instead." }, { status: 409 });
    }
    console.error("[REGISTER_INSTITUTE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

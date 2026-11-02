import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Public sign-up: students and parents are active immediately, mentors wait for admin approval.
// Admin roles can only be granted by an existing admin.
const SELF_SERVICE_ROLES = ["STUDENT", "PARENT", "MENTOR"] as const;
type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    const role: SelfServiceRole = SELF_SERVICE_ROLES.includes(body.role) ? body.role : "STUDENT";

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const exist = await prisma.user.findUnique({ where: { email } });
    if (exist) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Single-institute deployments: attach new accounts to the default (oldest) organization
    const defaultOrg = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: await bcrypt.hash(password, 10),
        role,
        status: role === "MENTOR" ? "PENDING" : "APPROVED",
        organizationId: defaultOrg?.id ?? null
      }
    });

    return NextResponse.json({
      success: true,
      requiresApproval: user.status === "PENDING",
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error("[REGISTER_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

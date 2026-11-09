import { NextResponse } from "next/server";
// Native bcrypt: runs on the libuv thread pool, so a login rush does not block the event loop
import * as bcrypt from "@node-rs/bcrypt";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { resolveSignupOrganization } from "@/lib/institutes";

// Public sign-up: students and parents are active immediately, mentors wait for admin approval.
// Admin roles can only be granted by an existing admin.
const SELF_SERVICE_ROLES = ["STUDENT", "PARENT", "MENTOR"] as const;
type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const limited = await rateLimit(`register:ip:${clientIp(request.headers)}`, 30, 60 * 60);
    if (!limited.ok) return tooManyRequests(limited.retryAfter, "Too many sign-ups from this network. Please try again later.");

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

    // Join the institute named by the join code (from the /join/<code> link or typed in)
    const org = await resolveSignupOrganization(body.joinCode);
    if ("error" in org) return NextResponse.json({ error: org.error, needsJoinCode: true }, { status: 400 });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: await bcrypt.hash(password, 10),
        role,
        status: role === "MENTOR" ? "PENDING" : "APPROVED",
        organizationId: org.id
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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantWhere } from "@/lib/api";
import { isStaff } from "@/lib/roles";

export async function GET() {
  try {
    const { session, error } = await requireRole();
    if (error) return error;

    const requests = await prisma.testRequest.findMany({
      where: isStaff(session.user.role)
        ? { status: "PENDING", user: tenantWhere(session) }
        : { userId: session.user.id },
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("[REQUESTS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(["STUDENT", "PARENT"]);
    if (error) return error;

    const { count, category, examCategory, notes } = await request.json();
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      return NextResponse.json({ error: "Request count must be between 1 and 10" }, { status: 400 });
    }

    const existingRequest = await prisma.testRequest.findFirst({
      where: { userId: session.user.id, status: "PENDING" }
    });
    if (existingRequest) {
      return NextResponse.json({ error: "You already have a pending request. Please wait for it to be reviewed." }, { status: 409 });
    }

    const testRequest = await prisma.testRequest.create({
      data: {
        userId: session.user.id,
        count: n,
        category: category === "MOCK" ? "MOCK" : "PRACTICE",
        examCategory: typeof examCategory === "string" ? examCategory.slice(0, 40) : null,
        notes: typeof notes === "string" ? notes.slice(0, 1000) : null,
        status: "PENDING"
      }
    });

    return NextResponse.json(testRequest);
  } catch (error) {
    console.error("[REQUESTS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

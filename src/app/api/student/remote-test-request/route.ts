import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

export async function GET() {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const requests = await prisma.testRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("[REMOTE_TEST_REQUEST_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const { count = 3, category = "MOCK", notes = "", examCategory = null } = await req.json();
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      return NextResponse.json({ error: "You can request between 1 and 10 tests" }, { status: 400 });
    }

    const pending = await prisma.testRequest.findFirst({ where: { userId: session.user.id, status: "PENDING" } });
    if (pending) {
      return NextResponse.json({ error: "You already have a pending request. Your mentor will review it shortly." }, { status: 409 });
    }

    const testRequest = await prisma.testRequest.create({
      data: {
        userId: session.user.id,
        count: n,
        category: category === "PRACTICE" ? "PRACTICE" : "MOCK",
        examCategory: typeof examCategory === "string" ? examCategory.slice(0, 40) : null,
        notes: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 1000) : null,
        status: "PENDING"
      }
    });

    return NextResponse.json({
      success: true,
      request: testRequest,
      message: "Request submitted! Your mentor will review and schedule it."
    });
  } catch (error) {
    console.error("[REMOTE_TEST_REQUEST_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

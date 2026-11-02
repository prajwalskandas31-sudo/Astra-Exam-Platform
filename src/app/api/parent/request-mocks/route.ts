import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mockPackages = [
      {
        id: "PKG-AFCAT-10",
        title: "AFCAT 2026 10-Mock Super Booster Pack",
        examCategory: "AFCAT",
        testCount: 10,
        price: 1999,
        description: "Full-length timed CBT mock tests with instant parent WhatsApp reports, detailed video solutions & rank analytics.",
        badge: "POPULAR"
      },
      {
        id: "PKG-GATE-15",
        title: "GATE Computer Science All-India Mock Series",
        examCategory: "GATE",
        testCount: 15,
        price: 2999,
        description: "Exact GATE CBT interface simulation with virtual calculator, sectional timing, and topic-by-topic weakness diagnostic.",
        badge: "BESTSELLER"
      },
      {
        id: "PKG-JEE-20",
        title: "JEE Main & Advanced 2026 Rank Builder Pack",
        examCategory: "JEE",
        testCount: 20,
        price: 3499,
        description: "20 Full-length CBT Mocks created by top Kota faculty + 1-on-1 mentor guidance feedback notes.",
        badge: "FEATURED"
      },
      {
        id: "PKG-NEET-25",
        title: "NEET UG 720-Marks Complete OMR & CBT Series",
        examCategory: "NEET",
        testCount: 25,
        price: 3999,
        description: "Pen-paper OMR bubble sheet simulator + online CBT mode with detailed NCERT page references.",
        badge: "PREMIUM"
      }
    ];

    const previousRequests = (await prisma.testRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20
    })).map((r) => ({
      id: r.id,
      examCategory: r.examCategory || "General",
      testCount: r.count,
      notes: r.notes || "",
      status: r.status,
      createdAt: r.createdAt
    }));

    return NextResponse.json({ mockPackages, previousRequests });
  } catch (error) {
    console.error("[PARENT_REQUEST_MOCKS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { examCategory = null, testCount = 5, notes = "", packageId = null } = await req.json();
    const count = Number(testCount);
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      return NextResponse.json({ error: "Choose between 1 and 50 tests" }, { status: 400 });
    }

    const pending = await prisma.testRequest.findFirst({ where: { userId: session.user.id, status: "PENDING" } });
    if (pending) {
      return NextResponse.json({ error: "You already have a pending request. The institute will review it shortly." }, { status: 409 });
    }

    const request = await prisma.testRequest.create({
      data: {
        userId: session.user.id,
        count,
        category: "MOCK",
        examCategory: typeof examCategory === "string" ? examCategory.slice(0, 40) : null,
        notes: [packageId ? `Package: ${packageId}` : "", typeof notes === "string" ? notes.trim() : ""].filter(Boolean).join(" — ").slice(0, 1000) || null,
        status: "PENDING"
      }
    });

    return NextResponse.json({
      success: true,
      request,
      message: packageId 
        ? "Package request sent! The institute will confirm and allocate the tests."
        : "Mock test request submitted to the institute for review."
    });
  } catch (error) {
    console.error("[PARENT_REQUEST_MOCKS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}



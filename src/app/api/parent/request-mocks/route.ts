import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PARENT") {
      return new NextResponse("Unauthorized", { status: 401 });
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

    const previousRequests = [
      {
        id: "REQ-901",
        examCategory: "AFCAT",
        testCount: 5,
        notes: "Requested additional 5 mock tests for AFCAT General Awareness & Reasoning focus.",
        status: "APPROVED",
        createdAt: "2026-09-28"
      },
      {
        id: "REQ-902",
        examCategory: "JEE",
        testCount: 3,
        notes: "Requesting extra remote proctored test before Sunday full mock.",
        status: "PENDING",
        createdAt: "2026-10-01"
      }
    ];

    return NextResponse.json({ mockPackages, previousRequests });
  } catch (error) {
    console.error("[PARENT_REQUEST_MOCKS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PARENT") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { examCategory = "JEE", testCount = 5, notes = "", packageId = null } = await req.json();

    const request = await prisma.testRequest.create({
      data: {
        userId: session.user.id,
        count: typeof testCount === "number" ? testCount : 5,
        category: "MOCK",
        status: "PENDING"
      }
    });

    return NextResponse.json({
      success: true,
      request,
      message: packageId 
        ? "Mock Test Package purchased & allocated to your child successfully!"
        : "Mock test request submitted to institute admin & faculty successfully!"
    });
  } catch (error) {
    console.error("[PARENT_REQUEST_MOCKS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const requests = await prisma.testRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("[REMOTE_TEST_REQUEST_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { count = 3, category = "MOCK", notes = "", examCategory = "JEE" } = body;

    const testRequest = await prisma.testRequest.create({
      data: {
        userId: session.user.id,
        count: typeof count === "number" ? count : 3,
        category: category === "MOCK" ? "MOCK" : "PRACTICE",
        status: "PENDING"
      }
    });

    return NextResponse.json({
      success: true,
      request: testRequest,
      message: "Remote proctored test request submitted successfully! Your mentor will schedule it."
    });
  } catch (error) {
    console.error("[REMOTE_TEST_REQUEST_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

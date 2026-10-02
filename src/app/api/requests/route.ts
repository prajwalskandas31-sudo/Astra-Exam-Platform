import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const isStaff = session.user.role === "ADMIN" || session.user.role === "MENTOR";

    const requests = await prisma.testRequest.findMany({
      where: isStaff ? { status: 'PENDING' } : { userId: session.user.id },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("[REQUESTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { count, category } = await request.json();
    
    if (count < 3 || count > 5) {
      return new NextResponse("Request count must be between 3 and 5", { status: 400 });
    }

    // Check for existing pending request
    const existingRequest = await prisma.testRequest.findFirst({
      where: {
        userId: session.user.id,
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      return new NextResponse("You already have a pending request. Please wait for approval.", { status: 400 });
    }

    const testRequest = await prisma.testRequest.create({
      data: {
        userId: session.user.id,
        count: count,
        category: category || "PRACTICE",
        status: 'PENDING'
      }
    });

    return NextResponse.json(testRequest);
  } catch (error) {
    console.error("[REQUESTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}



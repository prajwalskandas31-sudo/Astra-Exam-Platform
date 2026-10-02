import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, phone: true }
    });

    // Default registered exams if not present
    return NextResponse.json({
      registeredExams: ["JEE", "NEET", "AFCAT", "GATE", "PLAB", "COMEDK"]
    });
  } catch (error) {
    console.error("[REGISTERED_EXAMS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { registeredExams } = await req.json();

    return NextResponse.json({
      success: true,
      registeredExams
    });
  } catch (error) {
    console.error("[REGISTERED_EXAMS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}



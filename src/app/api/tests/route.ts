import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const where: any = {};
    if (session.user.role === "STUDENT") {
      where.isPublished = true;
    }
    if (type) {
      where.type = type;
    }

    const tests = await prisma.test.findMany({
      where,
      include: {
        attempts: {
          where: { userId: session.user.id }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(tests);
  } catch (error) {
    console.error("[TESTS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MENTOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, duration, totalMarks, type, isPublished, questionIds } = body;

    const test = await prisma.test.create({
      data: {
        title,
        description,
        duration,
        totalMarks,
        type: type || "PRACTICE",
        isPublished,
        questions: {
          create: questionIds.map((id: string, index: number) => ({
            question: { connect: { id } },
            order: index
          }))
        }
      }
    });

    return NextResponse.json(test);
  } catch (error) {
    console.error("[TESTS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}



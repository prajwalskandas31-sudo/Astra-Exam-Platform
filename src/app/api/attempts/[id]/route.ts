import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: {
        test: {
          include: {
            template: true,
            questions: {
              include: {
                question: true
              },
              orderBy: {
                order: 'asc'
              }
            }
          }
        },
        answers: {
          include: {
            question: true
          }
        }
      }
    });

    if (!attempt) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Verify access
    if (session.user.role === "STUDENT" && attempt.userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    return NextResponse.json(attempt);
  } catch (error) {
    console.error("[ATTEMPT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}



import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MENTOR")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const students = await prisma.user.findMany({
      where: { 
        role: 'STUDENT',
        status: 'APPROVED'
      },
      include: {
        attempts: {
          include: {
            test: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("[MENTOR_STUDENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

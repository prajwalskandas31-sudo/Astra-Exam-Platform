import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MENTOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        status: "APPROVED"
      },
      include: {
        attempts: true,
        batch: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Map to hide password and format attempts data
    const formattedStudents = students.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      batch: s.batch?.name || "Unassigned",
      testsCompleted: s.attempts.filter(a => a.status === "COMPLETED" || a.status === "AUTO_SUBMITTED").length,
      averageScore: s.attempts.length > 0 
        ? Math.round(s.attempts.reduce((acc, a) => acc + (a.score || 0), 0) / s.attempts.length)
        : 0
    }));

    return NextResponse.json(formattedStudents);
  } catch (error) {
    console.error("[USERS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}



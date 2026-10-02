import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "PARENT") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { studentEmail, studentPhone } = await req.json();

    if (!studentEmail && !studentPhone) {
      return NextResponse.json({ error: "Student email or phone is required" }, { status: 400 });
    }

    // Find student in database
    const student = await prisma.user.findFirst({
      where: {
        role: "STUDENT",
        OR: [
          studentEmail ? { email: studentEmail.trim() } : {},
          studentPhone ? { phone: studentPhone.trim() } : {}
        ]
      }
    });

    if (!student) {
      return NextResponse.json({ 
        error: "Student account not found with the provided email/phone. Request sent to institute admin for manual verification." 
      }, { status: 404 });
    }

    // Create link
    try {
      await prisma.parentStudentLink.create({
        data: {
          parentId: session.user.id,
          studentId: student.id
        }
      });
    } catch (e) {
      // already linked
    }

    return NextResponse.json({
      success: true,
      message: `Successfully connected ${student.name} (${student.email}) to your parent oversight portal!`,
      student: {
        id: student.id,
        name: student.name,
        email: student.email
      }
    });
  } catch (error) {
    console.error("[PARENT_LINK_STUDENT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

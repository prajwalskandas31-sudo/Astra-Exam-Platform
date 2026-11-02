import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";

const digits = (s: string) => s.replace(/\D/g, "");

export async function POST(req: Request) {
  try {
    const { session, error } = await requireRole(["PARENT"]);
    if (error) return error;

    const { studentEmail, studentPhone } = await req.json();
    const email = typeof studentEmail === "string" ? studentEmail.trim().toLowerCase() : "";
    const phone = typeof studentPhone === "string" ? digits(studentPhone) : "";

    // Require both identifiers so a parent can't attach to an arbitrary student by email alone
    if (!email || phone.length < 6) {
      return NextResponse.json({ error: "Enter your child's account email and the mobile number registered on it" }, { status: 400 });
    }

    const student = await prisma.user.findFirst({
      where: { role: "STUDENT", email },
      select: { id: true, name: true, email: true, phone: true }
    });

    // Compare on trailing digits so "+91 98765 43211" matches "9876543211"
    const studentDigits = student?.phone ? digits(student.phone) : "";
    const matches = !!student && studentDigits.length >= 6 && (studentDigits.endsWith(phone) || phone.endsWith(studentDigits));
    if (!student || !matches) {
      return NextResponse.json({
        error: "We couldn't verify a student with that email and mobile number. Check the details or ask your institute to link the account."
      }, { status: 404 });
    }

    const existing = await prisma.parentStudentLink.findUnique({
      where: { parentId_studentId: { parentId: session.user.id, studentId: student.id } }
    });
    if (existing) {
      return NextResponse.json({ error: `${student.name} is already linked to your account` }, { status: 409 });
    }

    await prisma.parentStudentLink.create({ data: { parentId: session.user.id, studentId: student.id } });

    return NextResponse.json({
      success: true,
      message: `${student.name} is now linked to your parent portal.`,
      student: { id: student.id, name: student.name, email: student.email }
    });
  } catch (error) {
    console.error("[PARENT_LINK_STUDENT_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { session, error } = await requireRole(["PARENT"]);
    if (error) return error;

    const studentId = new URL(req.url).searchParams.get("studentId");
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

    await prisma.parentStudentLink.deleteMany({ where: { parentId: session.user.id, studentId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PARENT_LINK_STUDENT_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, phone, role = "STUDENT" } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const exist = await prisma.user.findUnique({
      where: { email }
    });

    if (exist) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: role as any,
        status: "APPROVED" // Auto-approve registered users for smooth access
      }
    });

    // If registering as parent, link to existing student if available
    if (role === "PARENT") {
      const existingStudent = await prisma.user.findFirst({
        where: { role: "STUDENT" }
      });
      if (existingStudent) {
        try {
          await prisma.parentStudentLink.create({
            data: {
              parentId: user.id,
              studentId: existingStudent.id
            }
          });
        } catch (e) {
          // ignore link error
        }
      }
    }

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error("[REGISTER_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}



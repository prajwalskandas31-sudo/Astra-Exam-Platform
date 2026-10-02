import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session || !["SUPER_ADMIN", "INSTITUTE_ADMIN", "FACULTY", "MENTOR", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status } = await request.json(); // APPROVED or REJECTED

    const testRequest = await prisma.testRequest.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json(testRequest);
  } catch (error) {
    console.error("[REQUEST_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}



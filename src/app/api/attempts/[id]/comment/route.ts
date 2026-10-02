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
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { comment } = await request.json();

    const attempt = await prisma.attempt.update({
      where: { id },
      data: { mentorComment: comment }
    });

    return NextResponse.json(attempt);
  } catch (error) {
    console.error("[ATTEMPT_COMMENT_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MENTOR")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { status } = await request.json(); // EXPECT "APPROVED" or "REJECTED"

    const updatedUser = await prisma.user.update({
      where: {
        id: id,
      },
      data: {
        status: status,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[USER_APPROVE_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}



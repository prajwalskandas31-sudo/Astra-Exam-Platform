import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, safeJson } from "@/lib/api";

export async function GET() {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { examTracks: true }
    });
    const registeredExams = safeJson<string[]>(user?.examTracks, []);

    return NextResponse.json({ registeredExams, onboarded: user?.examTracks != null });
  } catch (error) {
    console.error("[REGISTERED_EXAMS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const { registeredExams } = await req.json();
    if (!Array.isArray(registeredExams)) {
      return NextResponse.json({ error: "registeredExams must be an array" }, { status: 400 });
    }
    const clean = [...new Set(registeredExams.filter((e): e is string => typeof e === "string").map((e) => e.trim().slice(0, 40)).filter(Boolean))].slice(0, 20);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { examTracks: JSON.stringify(clean) }
    });

    return NextResponse.json({ success: true, registeredExams: clean });
  } catch (error) {
    console.error("[REGISTERED_EXAMS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

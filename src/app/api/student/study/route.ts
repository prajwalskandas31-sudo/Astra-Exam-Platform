import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole } from "@/lib/api";
import { getStudySnapshot } from "@/lib/studySnapshot";

/** Study plan widgets: exam countdown, daily goal, streak, heatmap, review queue, readiness. */
export async function GET() {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;
    return NextResponse.json(await getStudySnapshot(session.user.id, session.user.organizationId ?? null));
  } catch (error) {
    console.error("[STUDY_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/** Update the student's exam date and/or daily question goal. */
export async function PATCH(request: Request) {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const body = await request.json();
    const data: { targetExamDate?: Date | null; dailyGoal?: number } = {};

    if (body.targetExamDate === null || body.targetExamDate === "") {
      data.targetExamDate = null;
    } else if (typeof body.targetExamDate === "string") {
      const d = new Date(body.targetExamDate);
      if (Number.isNaN(d.getTime())) return jsonError("Invalid exam date");
      data.targetExamDate = d;
    }
    if (body.dailyGoal !== undefined) {
      const goal = Number(body.dailyGoal);
      if (!Number.isInteger(goal) || goal < 5 || goal > 500) return jsonError("Daily goal must be between 5 and 500 questions");
      data.dailyGoal = goal;
    }
    if (Object.keys(data).length === 0) return jsonError("Nothing to update");

    await prisma.user.update({ where: { id: session.user.id }, data });
    return NextResponse.json(await getStudySnapshot(session.user.id, session.user.organizationId ?? null));
  } catch (error) {
    console.error("[STUDY_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

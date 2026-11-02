import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantOrGlobalWhere, tenantWhere } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";

export async function GET() {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;
    const org = tenantWhere(session);

    const [totalStudents, totalQuestions, totalTests, totalAttempts, pendingRequests] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT", ...org } }),
      prisma.question.count({ where: tenantOrGlobalWhere(session) }),
      prisma.test.count({ where: { ownerId: null, ...tenantOrGlobalWhere(session) } }),
      prisma.attempt.count({ where: { status: { in: ["COMPLETED", "AUTO_SUBMITTED"] }, user: org } }),
      prisma.testRequest.count({ where: { status: "PENDING", user: org } })
    ]);

    return NextResponse.json({ totalStudents, totalQuestions, totalTests, totalAttempts, pendingRequests });
  } catch (error) {
    console.error("[MENTOR_STATS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

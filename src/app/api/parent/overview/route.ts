import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, safeJson } from "@/lib/api";
import { getStudySnapshot } from "@/lib/studySnapshot";

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function GET() {
  try {
    const { session, error } = await requireRole(["PARENT"]);
    if (error) return error;

    const parentLinks = await prisma.parentStudentLink.findMany({
      where: { parentId: session.user.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            organizationId: true,
            batch: { select: { name: true } },
            attempts: {
              where: { status: { in: ["COMPLETED", "AUTO_SUBMITTED"] } },
              orderBy: { createdAt: "desc" },
              include: { test: { select: { id: true, title: true, totalMarks: true, type: true, mode: true } } }
            }
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    const studySnapshots = await Promise.all(parentLinks.map(({ student: s }) => getStudySnapshot(s.id, s.organizationId)));

    const studentsOverview = parentLinks.map(({ student: s }, index) => {
      const completed = s.attempts;
      const latest = completed[0] || null;
      const avgPercentage = completed.length > 0
        ? completed.reduce((acc, a) => acc + (a.percentage || 0), 0) / completed.length
        : 0;
      const avgAccuracy = completed.length > 0
        ? completed.reduce((acc, a) => acc + (a.accuracy || 0), 0) / completed.length
        : 0;

      // Count how often each topic was flagged weak, most recent attempts first
      const weakCounts = new Map<string, number>();
      for (const a of completed) {
        for (const t of safeJson<string[]>(a.weakTopics, [])) weakCounts.set(t, (weakCounts.get(t) || 0) + 1);
      }
      const weakTopics = [...weakCounts.entries()].sort((x, y) => y[1] - x[1]).map(([t]) => t).slice(0, 8);

      const subjectTotals: Record<string, { correct: number; total: number }> = {};
      for (const a of completed) {
        const subj = safeJson<Record<string, { correct: number; total: number }>>(a.subjectScores, {});
        for (const [name, st] of Object.entries(subj)) {
          subjectTotals[name] ??= { correct: 0, total: 0 };
          subjectTotals[name].correct += st.correct || 0;
          subjectTotals[name].total += st.total || 0;
        }
      }

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        batch: s.batch?.name || "Unassigned",
        totalTestsAttempted: completed.length,
        avgScore: round1(avgPercentage),
        avgAccuracy: round1(avgAccuracy),
        latestTest: latest ? {
          title: latest.test.title,
          score: round1(latest.score || 0),
          percentage: round1(latest.percentage || 0),
          accuracy: round1(latest.accuracy || 0),
          rank: latest.rank,
          date: latest.createdAt
        } : null,
        weakTopics,
        study: studySnapshots[index],
        subjects: Object.entries(subjectTotals).map(([name, st]) => ({
          name,
          accuracy: st.total > 0 ? round1((st.correct / st.total) * 100) : 0,
          questions: st.total
        })),
        attempts: completed.map((a) => ({
          id: a.id,
          test: a.test,
          score: round1(a.score || 0),
          accuracy: round1(a.accuracy || 0),
          percentage: round1(a.percentage || 0),
          rank: a.rank,
          percentile: a.percentile,
          isRetry: a.isRetry,
          createdAt: a.createdAt,
          weakTopics: safeJson<string[]>(a.weakTopics, []),
          strongTopics: safeJson<string[]>(a.strongTopics, []),
          mentorComment: a.mentorComment
        }))
      };
    });

    return NextResponse.json({
      parentName: session.user.name,
      students: studentsOverview
    });
  } catch (error) {
    console.error("[PARENT_OVERVIEW_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

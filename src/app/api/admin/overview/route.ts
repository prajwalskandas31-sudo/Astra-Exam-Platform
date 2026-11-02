import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, safeJson, tenantOrGlobalWhere, tenantWhere } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Institute-wide KPIs, leaderboard and weak-topic heatmap for the admin and mentor dashboards. */
export async function GET() {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;
    const org = tenantWhere(session);

    const [roleCounts, pendingUsers, pendingRequests, questionCount, tests, attempts, recentNotifications] = await Promise.all([
      prisma.user.groupBy({ by: ["role"], where: org, _count: true }),
      prisma.user.count({ where: { ...org, status: "PENDING" } }),
      prisma.testRequest.count({ where: { status: "PENDING", user: org } }),
      prisma.question.count({ where: tenantOrGlobalWhere(session) }),
      prisma.test.findMany({
        where: { ownerId: null, ...tenantOrGlobalWhere(session) },
        select: { id: true, title: true, isPublished: true, type: true, mode: true, _count: { select: { attempts: true, questions: true } } }
      }),
      prisma.attempt.findMany({
        where: { status: { in: ["COMPLETED", "AUTO_SUBMITTED"] }, isRetry: false, user: org },
        select: {
          id: true, percentage: true, accuracy: true, score: true, createdAt: true, weakTopics: true, subjectScores: true,
          user: { select: { id: true, name: true, batch: { select: { name: true } } } },
          test: { select: { title: true } }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.notificationLog.findMany({
        where: org,
        select: { id: true, recipientPhone: true, type: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5
      })
    ]);

    const counts = Object.fromEntries(roleCounts.map((r) => [r.role, r._count]));

    // Leaderboard: average percentage per student
    const perStudent = new Map<string, { id: string; name: string; batch: string; total: number; n: number; best: number }>();
    for (const a of attempts) {
      const s = perStudent.get(a.user.id) ?? { id: a.user.id, name: a.user.name, batch: a.user.batch?.name || "Unassigned", total: 0, n: 0, best: 0 };
      s.total += a.percentage || 0;
      s.n++;
      s.best = Math.max(s.best, a.percentage || 0);
      perStudent.set(a.user.id, s);
    }
    const leaderboard = [...perStudent.values()]
      .map((s) => ({ id: s.id, name: s.name, batch: s.batch, tests: s.n, avgPercentage: round1(s.total / s.n), best: round1(s.best) }))
      .sort((a, b) => b.avgPercentage - a.avgPercentage)
      .slice(0, 10);

    const weakCounts = new Map<string, number>();
    const subjectAcc = new Map<string, { correct: number; total: number }>();
    for (const a of attempts) {
      for (const t of safeJson<string[]>(a.weakTopics, [])) weakCounts.set(t, (weakCounts.get(t) || 0) + 1);
      for (const [name, st] of Object.entries(safeJson<Record<string, { correct: number; total: number }>>(a.subjectScores, {}))) {
        const cur = subjectAcc.get(name) ?? { correct: 0, total: 0 };
        cur.correct += st.correct || 0;
        cur.total += st.total || 0;
        subjectAcc.set(name, cur);
      }
    }

    // Attempts per day for the last 14 days
    const days: { date: string; attempts: number; avgPercentage: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const dayAttempts = attempts.filter((a) => a.createdAt >= d && a.createdAt < next);
      days.push({
        // Local calendar day (toISOString would shift the day for non-UTC timezones)
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        attempts: dayAttempts.length,
        avgPercentage: dayAttempts.length ? round1(dayAttempts.reduce((s, a) => s + (a.percentage || 0), 0) / dayAttempts.length) : 0
      });
    }

    return NextResponse.json({
      counts: {
        students: counts.STUDENT || 0,
        parents: counts.PARENT || 0,
        staff: (counts.FACULTY || 0) + (counts.MENTOR || 0),
        admins: (counts.INSTITUTE_ADMIN || 0) + (counts.SUPER_ADMIN || 0),
        questions: questionCount,
        tests: tests.length,
        publishedTests: tests.filter((t) => t.isPublished).length,
        attempts: attempts.length,
        pendingUsers,
        pendingRequests
      },
      avgPercentage: attempts.length ? round1(attempts.reduce((s, a) => s + (a.percentage || 0), 0) / attempts.length) : 0,
      avgAccuracy: attempts.length ? round1(attempts.reduce((s, a) => s + (a.accuracy || 0), 0) / attempts.length) : 0,
      leaderboard,
      weakTopics: [...weakCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([topic, count]) => ({ topic, count })),
      subjects: [...subjectAcc.entries()].map(([name, st]) => ({ name, accuracy: st.total ? round1((st.correct / st.total) * 100) : 0, questions: st.total })),
      activity: days,
      topTests: tests.sort((a, b) => b._count.attempts - a._count.attempts).slice(0, 5).map((t) => ({ id: t.id, title: t.title, attempts: t._count.attempts, questions: t._count.questions, isPublished: t.isPublished })),
      recentAttempts: attempts.slice(0, 8).map((a) => ({ id: a.id, student: a.user.name, test: a.test.title, percentage: round1(a.percentage || 0), date: a.createdAt })),
      recentNotifications
    });
  } catch (error) {
    console.error("[ADMIN_OVERVIEW_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

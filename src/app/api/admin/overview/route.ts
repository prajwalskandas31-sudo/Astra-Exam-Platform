import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, safeJson, tenantOrGlobalWhere, tenantWhere } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";
import { parseConfig } from "@/lib/messaging/config";

const round1 = (n: number) => Math.round(n * 10) / 10;
const FINISHED = { in: ["COMPLETED" as const, "AUTO_SUBMITTED" as const] };
/** Weak topics and subject accuracy are read from this many recent results, not the whole history. */
const TOPIC_SAMPLE = 1000;

/**
 * Institute-wide KPIs, leaderboard, weak-topic heatmap and setup progress for the admin and
 * mentor dashboards. Every query is an aggregate or bounded, so the page stays fast for an
 * institute with hundreds of thousands of results.
 */
export async function GET() {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;
    const org = tenantWhere(session);
    const finishedWhere = { status: FINISHED, isRetry: false, user: org };
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 13);

    const [roleCounts, pendingUsers, pendingRequests, questionCount, tests, totals, ranking, sample, recent, recentNotifications] = await Promise.all([
      prisma.user.groupBy({ by: ["role"], where: org, _count: true }),
      prisma.user.count({ where: { ...org, status: "PENDING" } }),
      prisma.testRequest.count({ where: { status: "PENDING", user: org } }),
      prisma.question.count({ where: tenantOrGlobalWhere(session) }),
      prisma.test.findMany({
        where: { ownerId: null, ...tenantOrGlobalWhere(session) },
        select: { id: true, title: true, isPublished: true, _count: { select: { attempts: true, questions: true } } },
      }),
      prisma.attempt.aggregate({ where: finishedWhere, _count: true, _avg: { percentage: true, accuracy: true } }),
      // Leaderboard: average percentage per student, ranked in the database
      prisma.attempt.groupBy({
        by: ["userId"],
        where: finishedWhere,
        _avg: { percentage: true },
        _max: { percentage: true },
        _count: { _all: true },
        orderBy: { _avg: { percentage: "desc" } },
        take: 10,
      }),
      prisma.attempt.findMany({
        where: finishedWhere,
        select: { weakTopics: true, subjectScores: true },
        orderBy: { createdAt: "desc" },
        take: TOPIC_SAMPLE,
      }),
      prisma.attempt.findMany({
        where: { ...finishedWhere, createdAt: { gte: since } },
        select: { id: true, percentage: true, createdAt: true, user: { select: { name: true } }, test: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.notificationLog.findMany({
        where: org,
        select: { id: true, recipientPhone: true, type: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const counts = Object.fromEntries(roleCounts.map((r) => [r.role, r._count]));

    const leaders = await prisma.user.findMany({
      where: { id: { in: ranking.map((r) => r.userId) } },
      select: { id: true, name: true, batch: { select: { name: true } } },
    });
    const byId = new Map(leaders.map((u) => [u.id, u]));
    const leaderboard = ranking.map((r) => ({
      id: r.userId,
      name: byId.get(r.userId)?.name ?? "Student",
      batch: byId.get(r.userId)?.batch?.name || "Unassigned",
      tests: r._count._all,
      avgPercentage: round1(r._avg.percentage ?? 0),
      best: round1(r._max.percentage ?? 0),
    }));

    const weakCounts = new Map<string, number>();
    const subjectAcc = new Map<string, { correct: number; total: number }>();
    for (const a of sample) {
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
      const dayAttempts = recent.filter((a) => a.createdAt >= d && a.createdAt < next);
      days.push({
        // Local calendar day (toISOString would shift the day for non-UTC timezones)
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        attempts: dayAttempts.length,
        avgPercentage: dayAttempts.length ? round1(dayAttempts.reduce((s, a) => s + (a.percentage || 0), 0) / dayAttempts.length) : 0,
      });
    }

    const lastResults = recent.length
      ? recent.slice(0, 8)
      : await prisma.attempt.findMany({
          where: finishedWhere,
          select: { id: true, percentage: true, createdAt: true, user: { select: { name: true } }, test: { select: { title: true } } },
          orderBy: { createdAt: "desc" },
          take: 8,
        });

    return NextResponse.json({
      counts: {
        students: counts.STUDENT || 0,
        parents: counts.PARENT || 0,
        staff: (counts.FACULTY || 0) + (counts.MENTOR || 0),
        admins: (counts.INSTITUTE_ADMIN || 0) + (counts.SUPER_ADMIN || 0),
        questions: questionCount,
        tests: tests.length,
        publishedTests: tests.filter((t) => t.isPublished).length,
        attempts: totals._count,
        pendingUsers,
        pendingRequests,
      },
      avgPercentage: round1(totals._avg.percentage ?? 0),
      avgAccuracy: round1(totals._avg.accuracy ?? 0),
      leaderboard,
      weakTopics: [...weakCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([topic, count]) => ({ topic, count })),
      subjects: [...subjectAcc.entries()].map(([name, st]) => ({ name, accuracy: st.total ? round1((st.correct / st.total) * 100) : 0, questions: st.total })),
      activity: days,
      topTests: tests.sort((a, b) => b._count.attempts - a._count.attempts).slice(0, 5).map((t) => ({ id: t.id, title: t.title, attempts: t._count.attempts, questions: t._count.questions, isPublished: t.isPublished })),
      recentAttempts: lastResults.map((a) => ({ id: a.id, student: a.user.name, test: a.test.title, percentage: round1(a.percentage || 0), date: a.createdAt })),
      recentNotifications,
      setup: await setupProgress(session.user.organizationId, { students: counts.STUDENT || 0, publishedTests: tests.filter((t) => t.isPublished).length, attempts: totals._count }),
    });
  } catch (error) {
    console.error("[ADMIN_OVERVIEW_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/** First-run checklist for a new institute: what is done and what to do next. */
async function setupProgress(organizationId: string | null | undefined, known: { students: number; publishedTests: number; attempts: number }) {
  if (!organizationId) return null;
  const [org, batches, ownQuestions] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { logoUrl: true, contactEmail: true, contactPhone: true, whatsappConfig: true } }),
    prisma.batch.count({ where: { organizationId } }),
    prisma.question.count({ where: { organizationId } }),
  ]);
  if (!org) return null;
  const messaging = parseConfig(org.whatsappConfig);
  return [
    { id: "branding", done: !!(org.logoUrl && (org.contactEmail || org.contactPhone)) },
    { id: "batches", done: batches > 0 },
    { id: "students", done: known.students > 0 },
    { id: "questions", done: ownQuestions > 0 },
    { id: "test", done: known.publishedTests > 0 },
    { id: "messaging", done: messaging.whatsapp.provider !== "OFF" || messaging.sms.provider !== "OFF" },
    { id: "firstResult", done: known.attempts > 0 },
  ];
}

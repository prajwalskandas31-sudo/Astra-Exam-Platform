import { prisma } from "./prisma";
import { computeStreak, dayKey, daysUntil } from "./study";

const HEATMAP_DAYS = 84; // 12 weeks
const round = (n: number) => Math.round(n);

export interface StudySnapshot {
  targetExamDate: string | null;
  daysToExam: number | null;
  dailyGoal: number;
  today: { questions: number; reviews: number; total: number; goalPct: number };
  streak: { current: number; best: number };
  activeDaysLast14: number;
  heatmap: { day: string; count: number }[];
  reviews: { due: number; total: number; mastered: number };
  readiness: { score: number; accuracy: number; coverage: number; consistency: number; answered: number };
}

/**
 * Everything the "study plan" widgets need for one student: exam countdown, today's goal,
 * streak, activity heatmap, review queue and an explainable readiness score.
 */
export async function getStudySnapshot(userId: string, organizationId: string | null): Promise<StudySnapshot> {
  const now = new Date();
  const since = dayKey(new Date(now.getTime() - (HEATMAP_DAYS - 1) * 86400000));

  const [user, logs, allDays, dueCount, totalCount, masteredCount, recentAnswers, bankTopics] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { targetExamDate: true, dailyGoal: true } }),
    prisma.studyLog.findMany({ where: { userId, day: { gte: since } } }),
    prisma.studyLog.findMany({ where: { userId }, select: { day: true } }),
    prisma.reviewItem.count({ where: { userId, dueAt: { lte: now } } }),
    prisma.reviewItem.count({ where: { userId } }),
    prisma.reviewItem.count({ where: { userId, intervalDays: { gte: 21 } } }),
    prisma.answer.findMany({
      where: { attempt: { userId, status: { in: ["COMPLETED", "AUTO_SUBMITTED"] } }, selectedOpt: { not: null } },
      select: { isCorrect: true, question: { select: { subject: true, topic: true } } },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
    prisma.question.findMany({
      where: { status: "PUBLISHED", OR: [{ organizationId }, { organizationId: null }] },
      select: { subject: true, topic: true },
      distinct: ["subject", "topic"],
    }),
  ]);

  const byDay = new Map(logs.map((l) => [l.day, l]));
  const heatmap = Array.from({ length: HEATMAP_DAYS }, (_, i) => {
    const day = dayKey(new Date(now.getTime() - (HEATMAP_DAYS - 1 - i) * 86400000));
    const l = byDay.get(day);
    return { day, count: l ? l.questions + l.reviews : 0 };
  });
  const todayLog = byDay.get(dayKey(now));
  const todayTotal = (todayLog?.questions ?? 0) + (todayLog?.reviews ?? 0);
  const dailyGoal = user?.dailyGoal ?? 30;
  const activeDaysLast14 = heatmap.slice(-14).filter((d) => d.count > 0).length;

  // Readiness = 50% recent accuracy + 30% syllabus coverage + 20% consistency (last 14 days)
  const accuracy = recentAnswers.length ? (recentAnswers.filter((a) => a.isCorrect).length / recentAnswers.length) * 100 : 0;
  const seenTopics = new Set(recentAnswers.map((a) => `${a.question.subject}::${a.question.topic}`));
  const coverage = bankTopics.length ? (bankTopics.filter((t) => seenTopics.has(`${t.subject}::${t.topic}`)).length / bankTopics.length) * 100 : 0;
  const consistency = (activeDaysLast14 / 14) * 100;
  // Too few answers to say anything meaningful: report 0 rather than a noisy number
  const score = recentAnswers.length >= 10 ? 0.5 * accuracy + 0.3 * coverage + 0.2 * consistency : 0;

  return {
    targetExamDate: user?.targetExamDate?.toISOString() ?? null,
    daysToExam: daysUntil(user?.targetExamDate, now),
    dailyGoal,
    today: {
      questions: todayLog?.questions ?? 0,
      reviews: todayLog?.reviews ?? 0,
      total: todayTotal,
      goalPct: dailyGoal > 0 ? Math.min(100, round((todayTotal / dailyGoal) * 100)) : 0,
    },
    streak: computeStreak(allDays.map((d) => d.day), now),
    activeDaysLast14,
    heatmap,
    reviews: { due: dueCount, total: totalCount, mastered: masteredCount },
    readiness: { score: round(score), accuracy: round(accuracy), coverage: round(coverage), consistency: round(consistency), answered: recentAnswers.length },
  };
}

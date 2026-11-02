import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, safeJson } from "@/lib/api";
import { canViewAttempt, isFinished } from "@/lib/attempts";
import { isStaff } from "@/lib/roles";

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const durationOf = (a: { startTime: Date; endTime: Date | null }) =>
  a.endTime ? Math.round((a.endTime.getTime() - a.startTime.getTime()) / 1000) : null;

/** Students see peers as "Priya S."; staff see full names. */
const displayName = (name: string, full: boolean) => {
  if (full) return name;
  const parts = name.split(" ").filter((p) => !/^(dr|mr|mrs|ms|miss|prof)\.?$/i.test(p));
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] ?? "Student";
};

type SubjectScores = Record<string, { score: number; maxScore: number; correct: number; total: number }>;

/**
 * How this attempt compares with everyone else who took the same test:
 * you vs topper vs average, a top-10 leaderboard and per-question peer stats.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, error } = await requireRole();
    if (error) return error;

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: { user: { select: { id: true, organizationId: true } }, test: { select: { id: true, ownerId: true } } },
    });
    if (!attempt) return jsonError("Not Found", 404);
    if (!(await canViewAttempt(session, attempt))) return jsonError("Forbidden", 403);
    if (!isFinished(attempt.status)) return jsonError("Finish the attempt first");

    // Each student's best first-time attempt at this test, limited to the owner's institute:
    // platform-wide tests are shared across tenants, and peers must never leak between them
    const finished = await prisma.attempt.findMany({
      where: {
        testId: attempt.testId,
        isRetry: false,
        status: { in: ["COMPLETED", "AUTO_SUBMITTED"] },
        user: { organizationId: attempt.user.organizationId },
      },
      select: {
        id: true, userId: true, score: true, percentage: true, accuracy: true, startTime: true, endTime: true, subjectScores: true,
        user: { select: { name: true } },
        answers: { select: { questionId: true, isCorrect: true, selectedOpt: true, timeSpent: true } },
      },
    });
    const bestByUser = new Map<string, (typeof finished)[number]>();
    for (const a of finished) {
      const cur = bestByUser.get(a.userId);
      if (!cur || (a.score ?? 0) > (cur.score ?? 0)) bestByUser.set(a.userId, a);
    }
    const field = [...bestByUser.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    // Per-question peer stats (everyone's best attempt)
    const qStats = new Map<string, { attempted: number; correct: number; time: number; seen: number }>();
    for (const a of field) {
      for (const ans of a.answers) {
        const s = qStats.get(ans.questionId) ?? { attempted: 0, correct: 0, time: 0, seen: 0 };
        s.seen++;
        s.time += ans.timeSpent;
        if (ans.selectedOpt) s.attempted++;
        if (ans.isCorrect) s.correct++;
        qStats.set(ans.questionId, s);
      }
    }
    const questions = Object.fromEntries(
      [...qStats.entries()].map(([qid, s]) => [qid, {
        pctCorrect: s.seen ? Math.round((s.correct / s.seen) * 100) : 0,
        pctAttempted: s.seen ? Math.round((s.attempted / s.seen) * 100) : 0,
        avgTime: s.seen ? Math.round(s.time / s.seen) : 0,
      }])
    );

    const summarize = (a: (typeof field)[number] | undefined) =>
      a ? { score: round1(a.score ?? 0), percentage: round1(a.percentage ?? 0), accuracy: round1(a.accuracy ?? 0), timeTaken: durationOf(a) } : null;

    const topper = field[0];
    const average = field.length
      ? {
          score: round1(avg(field.map((a) => a.score ?? 0))),
          percentage: round1(avg(field.map((a) => a.percentage ?? 0))),
          accuracy: round1(avg(field.map((a) => a.accuracy ?? 0))),
          timeTaken: Math.round(avg(field.map(durationOf).filter((t): t is number => t !== null))),
        }
      : null;

    // Subject-wise: you vs topper vs average (as % of subject max marks)
    const subjectPct = (s: SubjectScores[string] | undefined) => (s && s.maxScore > 0 ? Math.max(0, (s.score / s.maxScore) * 100) : 0);
    const mine = safeJson<SubjectScores>(attempt.subjectScores, {});
    const topperSubjects = safeJson<SubjectScores>(topper?.subjectScores, {});
    const allSubjects = field.map((a) => safeJson<SubjectScores>(a.subjectScores, {}));
    const subjects = Object.keys(mine).map((name) => ({
      name,
      you: round1(subjectPct(mine[name])),
      topper: round1(subjectPct(topperSubjects[name])),
      average: round1(avg(allSubjects.map((s) => subjectPct(s[name])))),
    }));

    const fullNames = isStaff(session.user.role);
    const leaderboard = field.slice(0, 10).map((a) => ({
      rank: field.findIndex((x) => (x.score ?? 0) === (a.score ?? 0)) + 1, // ties share a rank
      name: displayName(a.user.name, fullNames || a.userId === session.user.id),
      score: round1(a.score ?? 0),
      percentage: round1(a.percentage ?? 0),
      timeTaken: durationOf(a),
      isSubject: a.userId === attempt.userId,
    }));

    return NextResponse.json({
      ranked: !attempt.isRetry && !attempt.test.ownerId,
      participants: field.length,
      you: { score: round1(attempt.score ?? 0), percentage: round1(attempt.percentage ?? 0), accuracy: round1(attempt.accuracy ?? 0), timeTaken: durationOf(attempt) },
      topper: summarize(topper),
      average,
      subjects,
      leaderboard,
      questions,
    });
  } catch (error) {
    console.error("[ATTEMPT_COMPARE_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

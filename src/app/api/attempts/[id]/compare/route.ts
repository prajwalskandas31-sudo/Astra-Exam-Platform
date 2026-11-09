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

const PEER_TTL_MS = 30_000;
const peerCache = new Map<string, { at: number; data: ReturnType<typeof loadPeerData> }>();

/**
 * Everything about a test's peer group that doesn't depend on who is asking: each student's best
 * first-time attempt (limited to the owner's institute, since platform-wide tests are shared across
 * tenants and peers must never leak between them) and per-question stats aggregated in Postgres.
 * Cached for 30 s per instance, so a whole batch opening results together costs one load.
 */
async function getPeerData(testId: string, organizationId: string | null) {
  // The cache key includes how many results exist (one cheap indexed count), so the moment
  // another student submits, everyone's comparison is recomputed instead of going stale
  const finishedCount = await prisma.attempt.count({
    where: { testId, isRetry: false, status: { in: ["COMPLETED", "AUTO_SUBMITTED"] }, user: { organizationId } },
  });
  const key = `${testId}:${organizationId ?? ""}:${finishedCount}`;
  const now = Date.now();
  const hit = peerCache.get(key);
  if (hit && now - hit.at < PEER_TTL_MS) return hit.data;
  const data = loadPeerData(testId, organizationId);
  peerCache.set(key, { at: now, data });
  data.catch(() => peerCache.delete(key));
  if (peerCache.size > 200) for (const [k, v] of peerCache) if (now - v.at >= PEER_TTL_MS) peerCache.delete(k);
  return data;
}

async function loadPeerData(testId: string, organizationId: string | null) {
  const finished = await prisma.attempt.findMany({
    where: { testId, isRetry: false, status: { in: ["COMPLETED", "AUTO_SUBMITTED"] }, user: { organizationId } },
    select: {
      id: true, userId: true, score: true, percentage: true, accuracy: true, startTime: true, endTime: true, subjectScores: true,
      user: { select: { name: true } },
    },
  });
  const bestByUser = new Map<string, (typeof finished)[number]>();
  for (const a of finished) {
    const cur = bestByUser.get(a.userId);
    if (!cur || (a.score ?? 0) > (cur.score ?? 0)) bestByUser.set(a.userId, a);
  }
  const field = [...bestByUser.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Per-question peer stats over everyone's best attempt, aggregated in the database
  const bestIds = field.map((a) => a.id);
  const rows = bestIds.length
    ? await prisma.$queryRaw<{ questionId: string; seen: number; attempted: number; correct: number; time: number }[]>`
        SELECT "questionId",
               COUNT(*)::int                                AS seen,
               COUNT("selectedOpt")::int                    AS attempted,
               COUNT(*) FILTER (WHERE "isCorrect")::int     AS correct,
               COALESCE(SUM("timeSpent"), 0)::int           AS time
        FROM "Answer" WHERE "attemptId" = ANY(${bestIds}::text[])
        GROUP BY "questionId"`
    : [];
  const questions = Object.fromEntries(
    rows.map((s) => [s.questionId, {
      pctCorrect: s.seen ? Math.round((s.correct / s.seen) * 100) : 0,
      pctAttempted: s.seen ? Math.round((s.attempted / s.seen) * 100) : 0,
      avgTime: s.seen ? Math.round(s.time / s.seen) : 0,
    }])
  );
  return { field, questions };
}

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
      include: { user: { select: { id: true, name: true, organizationId: true } }, test: { select: { id: true, ownerId: true } } },
    });
    if (!attempt) return jsonError("Not Found", 404);
    if (!(await canViewAttempt(session, attempt))) return jsonError("Forbidden", 403);
    if (!isFinished(attempt.status)) return jsonError("Finish the attempt first");

    const peers = await getPeerData(attempt.testId, attempt.user.organizationId);
    const { questions } = peers;
    // The cache can predate this submission: make sure the requester's own result is in the field
    let field = peers.field;
    if (!attempt.isRetry) {
      const own = field.find((a) => a.userId === attempt.userId);
      if (!own || (own.id !== attempt.id && (attempt.score ?? 0) > (own.score ?? 0))) {
        field = [...field.filter((a) => a.userId !== attempt.userId), { ...attempt, user: { name: attempt.user.name } }]
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      }
    }

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

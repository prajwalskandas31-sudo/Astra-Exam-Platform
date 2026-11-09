import type { Session } from "next-auth";
import { prisma } from "./prisma";
import { isStaff } from "./roles";
import { rateLimit } from "./rateLimit";

export const FINISHED_STATUSES = ["COMPLETED", "AUTO_SUBMITTED"] as const;

export const isFinished = (status: string) => (FINISHED_STATUSES as readonly string[]).includes(status);

/**
 * A retest attempt only covers the questions pre-seeded as answers when it was
 * created; a normal attempt covers the whole test.
 */
export function attemptQuestionFilter<T extends { questionId: string }>(
  attempt: { isRetry: boolean; answers: { questionId: string }[] },
  testQuestions: T[]
): T[] {
  if (!attempt.isRetry) return testQuestions;
  const ids = new Set(attempt.answers.map((a) => a.questionId));
  return testQuestions.filter((tq) => ids.has(tq.questionId));
}

/** Seconds left on an attempt, never more than the wall-clock time since it started allows. */
export function serverTimeRemaining(attempt: { startTime: Date; timeRemaining: number }, durationMinutes: number) {
  const elapsed = Math.floor((Date.now() - attempt.startTime.getTime()) / 1000);
  return Math.max(0, Math.min(attempt.timeRemaining, durationMinutes * 60 - elapsed));
}

/**
 * Answers that were already on their way when the clock ran out are still accepted for this
 * long after the deadline, so a slow network at 00:00 doesn't cost a student their last answers.
 */
export const DEADLINE_GRACE_SECONDS = 60;

/** True while the attempt may still take answers (server clock plus the grace period). */
export function acceptsAnswers(attempt: { startTime: Date }, durationMinutes: number, now = Date.now()) {
  return now <= attempt.startTime.getTime() + (durationMinutes * 60 + DEADLINE_GRACE_SECONDS) * 1000;
}

export interface IncomingAnswer {
  questionId: string;
  selectedOption: string | null;
  status: string;
  timeSpent?: number;
}

const ANSWER_STATUSES = new Set(["NOT_VISITED", "UNANSWERED", "ANSWERED", "MARKED_FOR_REVIEW", "ANSWERED_AND_MARKED"]);
const MAX_ANSWERS_PER_WRITE = 1000;

/** Validate and normalise a client payload (object keyed by question id, or an array). */
export function parseIncomingAnswers(raw: unknown): IncomingAnswer[] {
  if (!raw || typeof raw !== "object") return [];
  const list = Array.isArray(raw) ? raw : Object.values(raw);
  const byQuestion = new Map<string, IncomingAnswer>();
  for (const a of list.slice(0, MAX_ANSWERS_PER_WRITE)) {
    if (!a || typeof a !== "object" || typeof a.questionId !== "string" || !a.questionId) continue;
    byQuestion.set(a.questionId, {
      questionId: a.questionId.slice(0, 64),
      selectedOption: a.selectedOption == null || a.selectedOption === "" ? null : String(a.selectedOption).slice(0, 200),
      status: ANSWER_STATUSES.has(a.status) ? a.status : "UNANSWERED",
      timeSpent: Math.min(86_400, Math.max(0, Math.floor(Number(a.timeSpent) || 0))),
    });
  }
  return [...byQuestion.values()];
}

/**
 * Save a batch of answers in ONE statement (instead of one upsert per answer).
 * Only questions that belong to the attempt's test are written, and nothing is written once
 * the attempt has been submitted, so a late autosave can't change a graded attempt.
 * `db` lets the submit route run this inside its transaction.
 */
export async function saveAnswers(
  attemptId: string,
  testId: string,
  answers: IncomingAnswer[],
  db: Pick<typeof prisma, "$executeRaw"> = prisma
): Promise<number> {
  if (answers.length === 0) return 0;
  const ids = answers.map(() => crypto.randomUUID());
  const questionIds = answers.map((a) => a.questionId);
  const selected = answers.map((a) => a.selectedOption);
  const statuses = answers.map((a) => a.status);
  const times = answers.map((a) => a.timeSpent ?? 0);

  return db.$executeRaw`
    INSERT INTO "Answer" ("id", "attemptId", "questionId", "selectedOpt", "status", "timeSpent", "updatedAt")
    SELECT x.id, ${attemptId}, x.qid, x.sel, x.st, x.ts, NOW()
    FROM unnest(${ids}::text[], ${questionIds}::text[], ${selected}::text[], ${statuses}::text[], ${times}::int[])
      AS x(id, qid, sel, st, ts)
    JOIN "TestQuestion" tq ON tq."testId" = ${testId} AND tq."questionId" = x.qid
    -- FOR SHARE: waits for an in-progress submit (which holds FOR UPDATE) and then re-checks the
    -- status, so answers can never land after the attempt was graded
    WHERE EXISTS (SELECT 1 FROM "Attempt" a WHERE a."id" = ${attemptId} AND a."status" IN ('IN_PROGRESS', 'PAUSED') FOR SHARE)
    ON CONFLICT ("attemptId", "questionId") DO UPDATE SET
      "selectedOpt" = EXCLUDED."selectedOpt",
      "status"      = EXCLUDED."status",
      "timeSpent"   = EXCLUDED."timeSpent",
      "updatedAt"   = NOW()`;
}

const RERANK_WINDOW_SECONDS = 10;

/**
 * Keep every result's stored rank and percentile correct as more students submit.
 * Ranks are stored on each attempt at submit time, so the first finisher would otherwise stay
 * "#1" forever. Recomputing everyone on every submit would be N² writes during a big exam, so:
 * the first submit in each 10 s window (claimed through the shared RateLimit table, so one
 * server instance does it) waits for the window to close and then re-ranks the whole test in a
 * single statement, covering every submit in that window. Call it from `after()`.
 */
export async function scheduleRerank(testId: string) {
  const claim = await rateLimit(`rerank:${testId}`, 1, RERANK_WINDOW_SECONDS);
  if (!claim.ok) return; // another submit in this window already scheduled it
  await new Promise((r) => setTimeout(r, RERANK_WINDOW_SECONDS * 1000));
  await prisma.$executeRaw`
    UPDATE "Attempt" AS a SET "rank" = r.rnk, "percentile" = r.pct
    FROM (
      SELECT "id",
             RANK() OVER (ORDER BY COALESCE("score", 0) DESC)::int AS rnk,
             CASE WHEN COUNT(*) OVER () > 1
                  THEN ROUND(((COUNT(*) OVER () - RANK() OVER (ORDER BY COALESCE("score", 0) DESC))::numeric
                              / (COUNT(*) OVER () - 1)) * 100, 1)::float8
                  ELSE 100 END AS pct
      FROM "Attempt"
      WHERE "testId" = ${testId} AND "isRetry" = false AND "status" IN ('COMPLETED', 'AUTO_SUBMITTED')
    ) AS r
    WHERE a."id" = r."id" AND (a."rank" IS DISTINCT FROM r.rnk OR a."percentile" IS DISTINCT FROM r.pct)`;
}

/** Who may view an attempt: its owner, staff of the same institute, or a linked parent. */
export async function canViewAttempt(session: Session, attempt: { userId: string; user?: { organizationId: string | null } | null }) {
  const { role, id, organizationId } = session.user;
  if (attempt.userId === id) return true;
  if (role === "SUPER_ADMIN") return true;
  if (isStaff(role)) {
    const ownerOrg = attempt.user?.organizationId ?? (await prisma.user.findUnique({ where: { id: attempt.userId }, select: { organizationId: true } }))?.organizationId;
    return !!organizationId && ownerOrg === organizationId;
  }
  if (role === "PARENT") {
    const link = await prisma.parentStudentLink.findUnique({
      where: { parentId_studentId: { parentId: id, studentId: attempt.userId } },
    });
    return !!link;
  }
  return false;
}

/**
 * Which tests a student may see: tests with no batches are for the whole institute,
 * otherwise the student must be in one of the test's batches.
 * Wrapped in AND so it can be spread next to the tenant filter (also an OR) without replacing it.
 */
export async function studentTestVisibility(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { batchId: true } });
  return {
    AND: [
      {
        OR: [
          { batches: { none: {} } },
          ...(user?.batchId ? [{ batches: { some: { id: user.batchId } } }] : []),
        ],
      },
    ],
  };
}

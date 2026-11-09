import { prisma } from "./prisma";
import { parseIncomingAnswers, scheduleRerank, type IncomingAnswer } from "./attempts";
import { verifyTicket, type OfflineTicket } from "./examCentre";
import { finalizeAttempt, missedQuestionIds } from "./grading";
import { logStudy, queueForReview } from "./study";
import { rateLimit } from "./rateLimit";
import { sendResult } from "./messaging/automations";

/**
 * Offline exams, server side.
 *
 * The device runs the whole exam from its downloaded paper. While it has internet it sends a
 * small checkpoint every couple of minutes (stored as a DRAFT row). On submit it uploads the
 * final answer sheet, which is stored as PENDING and answered with 202 straight away; grading
 * happens afterwards in a background drain that works through the queue at a steady pace.
 * So when a whole centre reconnects at once, every upload is one cheap insert and the heavy
 * work (grading, ranks, messages) is spread out instead of spiking.
 */

export interface AnswerSheet {
  ticket: string;
  startedAt: number;
  submittedAt?: number;
  reason?: string | null;
  violations?: number;
  deviceId?: string | null;
  answers: unknown;
}

export type UploadResult =
  | { ok: true; status: "received" | "duplicate" | "checkpoint" | "already_submitted" }
  | { ok: false; error: string; status: number };

const MAX_PAYLOAD_CHARS = 1_500_000;
/** Extra seconds allowed beyond the exam duration (slow devices, network). */
const GRACE_SECONDS = 120;
/** How long after the exam a student's device may still upload its own sheet. Staff uploads have no limit. */
const UPLOAD_WINDOW_MS = 48 * 3_600_000;
/** A checkpoint this close to the final upload means the device was online through the end. */
const ONLINE_GAP_MS = 5 * 60_000;

function parseSheet(raw: unknown): { sheet: AnswerSheet; ticket: OfflineTicket; answers: IncomingAnswer[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const ticket = verifyTicket(s.ticket);
  if (!ticket || typeof s.startedAt !== "number" || !Number.isFinite(s.startedAt)) return null;
  const answers = parseIncomingAnswers(s.answers);
  const sheet: AnswerSheet = {
    ticket: s.ticket as string,
    startedAt: s.startedAt,
    submittedAt: typeof s.submittedAt === "number" && Number.isFinite(s.submittedAt) ? s.submittedAt : undefined,
    reason: typeof s.reason === "string" ? s.reason.slice(0, 20) : null,
    violations: Math.min(100, Math.max(0, Math.floor(Number(s.violations) || 0))),
    deviceId: typeof s.deviceId === "string" ? s.deviceId.slice(0, 64) : null,
    answers,
  };
  return { sheet, ticket, answers };
}

/**
 * Store a checkpoint (`final` = false) or a final answer sheet. `uploader` is either the student
 * (their own sheet) or staff of the same institute uploading sheets exported from devices.
 */
export async function receiveSheet(
  raw: unknown,
  uploader: { id: string; role: string; organizationId?: string | null },
  final: boolean
): Promise<UploadResult> {
  const parsed = parseSheet(raw);
  if (!parsed) return { ok: false, error: "This answer sheet isn't valid", status: 400 };
  const { sheet, ticket, answers } = parsed;

  const isOwner = uploader.id === ticket.userId;
  if (!isOwner && uploader.role === "STUDENT") return { ok: false, error: "This answer sheet belongs to another student", status: 403 };

  const test = await prisma.test.findUnique({
    where: { id: ticket.testId },
    select: { id: true, allowOffline: true, organizationId: true, duration: true, scheduledEnd: true },
  });
  if (!test || !test.allowOffline) return { ok: false, error: "This test doesn't accept offline answer sheets", status: 404 };
  if (final && typeof sheet.submittedAt !== "number") return { ok: false, error: "This answer sheet has no submit time", status: 400 };

  // A student's own device must upload within the window; after that, the invigilator uploads
  // the exported file (staff uploads are audited)
  const examEnd = Math.max(test.scheduledEnd?.getTime() ?? 0, ticket.issuedAt + test.duration * 60_000);
  if (isOwner && Date.now() > examEnd + UPLOAD_WINDOW_MS) {
    return { ok: false, error: "The upload window for this exam has closed. Download your answer file and give it to your invigilator.", status: 410 };
  }
  const limitSeconds = test.duration * 60 + GRACE_SECONDS;
  if (!isOwner) {
    const student = await prisma.user.findUnique({ where: { id: ticket.userId }, select: { organizationId: true } });
    if (!student || !uploader.organizationId || student.organizationId !== uploader.organizationId) {
      return { ok: false, error: "This answer sheet is from another institute", status: 403 };
    }
  }

  // Already graded online (or from an earlier upload)? Nothing to do.
  const finished = await prisma.attempt.findFirst({
    where: { userId: ticket.userId, testId: ticket.testId, isRetry: false, status: { in: ["COMPLETED", "AUTO_SUBMITTED"] } },
    select: { id: true },
  });
  if (finished) return { ok: true, status: "already_submitted" };

  const payload = JSON.stringify(sheet);
  if (payload.length > MAX_PAYLOAD_CHARS) return { ok: false, error: "Answer sheet is too large", status: 413 };
  const answered = answers.filter((a) => a.selectedOption).length;
  const id = crypto.randomUUID();

  if (!final) {
    // Checkpoints only ever replace an earlier checkpoint, never a submitted sheet
    // The server's own clock decides which checkpoints were "on time": the last one received within
    // the time limit of the first one is kept as onTimePayload, whatever the device clock says
    await prisma.$executeRaw`
      INSERT INTO "PendingSubmission" ("id", "testId", "userId", "payload", "status", "answeredCount", "updatedAt", "firstSeenAt", "onTimePayload")
      VALUES (${id}, ${ticket.testId}, ${ticket.userId}, ${payload}, 'DRAFT', ${answered}, NOW(), NOW(), ${payload})
      ON CONFLICT ("testId", "userId") DO UPDATE SET
        "payload" = EXCLUDED."payload", "answeredCount" = EXCLUDED."answeredCount", "updatedAt" = NOW(),
        "onTimePayload" = CASE
          WHEN NOW() <= "PendingSubmission"."firstSeenAt" + make_interval(secs => ${limitSeconds}::double precision) THEN EXCLUDED."payload"
          ELSE "PendingSubmission"."onTimePayload" END
      WHERE "PendingSubmission"."status" = 'DRAFT'`;
    return { ok: true, status: "checkpoint" };
  }

  // A final sheet replaces a checkpoint; a second final upload (retry) changes nothing
  const changed = await prisma.$executeRaw`
    INSERT INTO "PendingSubmission" ("id", "testId", "userId", "payload", "status", "answeredCount", "updatedAt", "receivedAt")
    VALUES (${id}, ${ticket.testId}, ${ticket.userId}, ${payload}, 'PENDING', ${answered}, NOW(), NOW())
    ON CONFLICT ("testId", "userId") DO UPDATE SET
      "payload" = EXCLUDED."payload", "answeredCount" = EXCLUDED."answeredCount", "status" = 'PENDING',
      "lastCheckpointAt" = "PendingSubmission"."updatedAt", "updatedAt" = NOW(), "receivedAt" = NOW()
    WHERE "PendingSubmission"."status" = 'DRAFT'`;
  return { ok: true, status: changed ? "received" : "duplicate" };
}

const BATCH = 10;
const PARALLEL = 4;

/**
 * Grade queued sheets until the queue is empty or `budgetMs` runs out. Only one drain starts per
 * 15 s window across all server instances (claimed through the shared RateLimit table), and
 * rows are claimed with SKIP LOCKED, so overlapping drains never grade the same sheet twice.
 * `force` skips the window claim (invigilator's "process now").
 */
export async function drainOfflineQueue({ budgetMs = 60_000, force = false, baseUrl }: { budgetMs?: number; force?: boolean; baseUrl?: string } = {}) {
  if (!force) {
    const claim = await rateLimit("offline-drain", 1, 15);
    if (!claim.ok) return { processed: 0, skipped: true };
  }
  const deadline = Date.now() + budgetMs;
  const touchedTests = new Set<string>();
  let processed = 0;

  while (Date.now() < deadline) {
    const rows = await prisma.$queryRaw<GradingRow[]>`
      UPDATE "PendingSubmission" SET "status" = 'PROCESSING', "claimedAt" = NOW()
      WHERE "id" IN (
        SELECT "id" FROM "PendingSubmission"
        WHERE "status" = 'PENDING'
           OR ("status" = 'PROCESSING' AND "claimedAt" < NOW() - interval '5 minutes') -- stale claim from a crashed drain
        ORDER BY "receivedAt"
        LIMIT ${BATCH}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "testId", "userId", "payload", "onTimePayload", "firstSeenAt", "lastCheckpointAt", "receivedAt"`;
    if (rows.length === 0) break;

    for (let i = 0; i < rows.length; i += PARALLEL) {
      await Promise.all(
        rows.slice(i, i + PARALLEL).map(async (row) => {
          try {
            const attemptId = await gradeSheet(row, baseUrl);
            await prisma.pendingSubmission.update({ where: { id: row.id }, data: { status: "DONE", attemptId, processedAt: new Date(), error: null } });
            touchedTests.add(row.testId);
          } catch (e) {
            console.error("[OFFLINE_GRADE]", row.id, e);
            await prisma.pendingSubmission
              .update({ where: { id: row.id }, data: { status: "FAILED", error: e instanceof Error ? e.message.slice(0, 300) : "Grading failed", processedAt: new Date() } })
              .catch(() => {});
          }
        })
      );
      processed += Math.min(PARALLEL, rows.length - i);
    }
  }

  // Ranks once per test at the end of the drain, not once per sheet
  await Promise.all([...touchedTests].map((t) => scheduleRerank(t).catch((e) => console.error("[OFFLINE_RERANK]", e))));
  return { processed, skipped: false };
}

interface GradingRow {
  id: string;
  testId: string;
  userId: string;
  payload: string;
  onTimePayload: string | null;
  firstSeenAt: Date;
  lastCheckpointAt: Date | null;
  receivedAt: Date;
}

/**
 * How long the server itself saw this exam running, from its own clock: first checkpoint to the
 * final upload if the device stayed online to the end, otherwise first to last checkpoint.
 * Null when the device never checked in during the exam (fully offline).
 */
export function serverObservedMs(row: Pick<GradingRow, "firstSeenAt" | "lastCheckpointAt" | "receivedAt">): number | null {
  if (!row.lastCheckpointAt) return null;
  const onlineToTheEnd = row.receivedAt.getTime() - row.lastCheckpointAt.getTime() <= ONLINE_GAP_MS;
  return (onlineToTheEnd ? row.receivedAt.getTime() : row.lastCheckpointAt.getTime()) - row.firstSeenAt.getTime();
}

/** Turn one answer sheet into a graded attempt. Returns the attempt ID. */
async function gradeSheet(row: GradingRow, baseUrl?: string): Promise<string> {
  const parsed = parseSheet(JSON.parse(row.payload));
  if (!parsed || parsed.ticket.userId !== row.userId || parsed.ticket.testId !== row.testId) throw new Error("Invalid answer sheet");
  const { sheet, ticket } = parsed;
  let { answers } = parsed;

  const test = await prisma.test.findUnique({ where: { id: row.testId }, select: { id: true, duration: true, scheduledStart: true } });
  if (!test) throw new Error("Test no longer exists");
  const limitMs = (test.duration * 60 + GRACE_SECONDS) * 1000;

  // Server-side enforcement: if the server saw the exam run past the limit, grade the last
  // checkpoint that arrived in time instead of the late sheet
  const observed = serverObservedMs(row);
  const overran = observed !== null && observed > limitMs;
  if (overran) {
    const onTime = row.onTimePayload ? parseSheet(JSON.parse(row.onTimePayload)) : null;
    answers = onTime && onTime.ticket.userId === row.userId ? onTime.answers : [];
  }

  // Device clocks can't be trusted blindly: the start can't be before the paper was issued
  // (server-signed) or long before the scheduled start, nor in the future
  const now = Date.now();
  const earliest = Math.max(ticket.issuedAt, (test.scheduledStart?.getTime() ?? 0) - 3_600_000);
  const startedAt = new Date(Math.min(now, Math.max(earliest, sheet.startedAt)));
  const submittedAt = new Date(Math.min(now, Math.max(startedAt.getTime(), sheet.submittedAt ?? startedAt.getTime() + test.duration * 60_000)));

  const existing = await prisma.attempt.findFirst({
    where: { userId: row.userId, testId: row.testId, isRetry: false },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, isRetry: true, testId: true },
  });
  if (existing && (existing.status === "COMPLETED" || existing.status === "AUTO_SUBMITTED")) return existing.id;

  const attempt =
    existing ??
    (await prisma.attempt.create({
      data: {
        userId: row.userId,
        testId: row.testId,
        status: "IN_PROGRESS",
        startTime: startedAt,
        timeRemaining: 0,
        offline: true,
        paperSeed: ticket.paperSeed,
        setCode: ticket.setCode,
        deviceId: sheet.deviceId ?? null,
      },
      select: { id: true, status: true, isRetry: true, testId: true },
    }));

  // Proctoring evidence the device collected, plus clock checks, for staff to review
  const flags: string[] = [];
  if (sheet.violations) flags.push(...Array(Math.min(20, sheet.violations)).fill("OFFLINE_PROCTORING"));
  if (overran) flags.push("OFFLINE_TIME_OVERRUN_SERVER");
  else if ((sheet.submittedAt ?? 0) - sheet.startedAt > limitMs) flags.push("OFFLINE_TIME_OVERRUN");
  if ((sheet.submittedAt ?? 0) > now + 5 * 60_000) flags.push("OFFLINE_CLOCK_AHEAD");
  if (flags.length) await prisma.violation.createMany({ data: flags.map((type) => ({ attemptId: attempt.id, type })) });

  const graded = await finalizeAttempt(attempt, {
    finalAnswers: answers,
    acceptFinalAnswers: true,
    autoSubmitted: overran || sheet.reason === "TIMEOUT" || sheet.reason === "VIOLATIONS" || sheet.reason === "COLLECTED",
    endTime: submittedAt,
  });
  if (graded) {
    await Promise.all([
      queueForReview(row.userId, missedQuestionIds(graded.result)),
      logStudy(row.userId, { questions: graded.result.attemptedCount }),
    ]).catch((e) => console.error("[OFFLINE_STUDY_LOG]", e));
    if (baseUrl) await sendResult(attempt.id, baseUrl).catch((e) => console.error("[OFFLINE_RESULT_ALERT]", e));
  }
  return attempt.id;
}

/**
 * After the exam: turn every remaining checkpoint into a submission (auto-submitted), so a
 * student whose computer died still gets graded on everything up to their last checkpoint.
 */
export async function collectCheckpoints(testId: string) {
  const drafts = await prisma.pendingSubmission.findMany({ where: { testId, status: "DRAFT" }, select: { id: true, payload: true, updatedAt: true } });
  for (const d of drafts) {
    let payload = d.payload;
    try {
      payload = JSON.stringify({ ...JSON.parse(d.payload), reason: "COLLECTED" });
    } catch {}
    await prisma.pendingSubmission.updateMany({ where: { id: d.id, status: "DRAFT" }, data: { payload, status: "PENDING", lastCheckpointAt: d.updatedAt, receivedAt: new Date(), updatedAt: new Date() } });
  }
  return drafts.length;
}

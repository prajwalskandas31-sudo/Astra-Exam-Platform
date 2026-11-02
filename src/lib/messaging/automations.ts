// The automated messages: result alerts, new-test alerts and the weekly parent digest.

import { prisma } from "@/lib/prisma";
import { isFinished } from "@/lib/attempts";
import { appBaseUrl, reportLinkFor } from "@/lib/reportLinks";
import { computeStreak, dayKey } from "@/lib/study";
import { notifyMany, type OutgoingMessage, type Recipient } from "./index";
import { parseConfig } from "./config";

const recipientFields = { id: true, name: true, phone: true, notifyWhatsapp: true, notifySms: true } as const;
const toRecipient = (u: { id: string; name: string; phone: string | null; notifyWhatsapp: boolean; notifySms: boolean }): Recipient => ({
  userId: u.id, name: u.name, phone: u.phone, notifyWhatsapp: u.notifyWhatsapp, notifySms: u.notifySms,
});
const firstName = (name: string) => name.split(" ").find((p) => !/^(dr|mr|mrs|ms|miss|prof)\.?$/i.test(p)) ?? name;

export type Audience = "PARENTS" | "STUDENT" | "BOTH";

/**
 * Send one attempt's result (with a short report link) to the student and/or linked parents.
 * `audience` defaults to the institute's rules; manual dispatch from faculty can override it.
 */
export async function sendResult(attemptId: string, baseUrl: string, audience?: Audience) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      test: { select: { title: true, ownerId: true, totalMarks: true } },
      user: { select: { ...recipientFields, organizationId: true, studentLinks: { select: { parent: { select: recipientFields } } } } },
    },
  });
  if (!attempt || !isFinished(attempt.status)) return { sent: 0, recipients: 0, reason: "Attempt not finished" };
  // Private practice quizzes are the student's own business
  if (attempt.test.ownerId) return { sent: 0, recipients: 0, reason: "Custom quizzes aren't reported" };

  const org = attempt.user.organizationId
    ? await prisma.organization.findUnique({ where: { id: attempt.user.organizationId }, select: { whatsappConfig: true } })
    : null;
  const rules = parseConfig(org?.whatsappConfig).rules;
  const toStudent = audience ? audience !== "PARENTS" : rules.resultToStudent;
  const toParents = audience ? audience !== "STUDENT" : rules.resultToParents;

  const link = await reportLinkFor({ id: attempt.id, userId: attempt.userId, organizationId: attempt.user.organizationId }, baseUrl);
  // Retests cover a subset of questions, so the paper total only applies to full attempts
  const maxScore = attempt.isRetry ? null : attempt.test.totalMarks;
  const score = `${Math.round((attempt.score ?? 0) * 10) / 10}${maxScore ? `/${maxScore}` : ""} marks, ${Math.round(attempt.percentage ?? 0)}%${attempt.rank && !attempt.isRetry ? `, rank #${attempt.rank}` : ""}`;
  const message = (recipientName: string): OutgoingMessage => ({
    organizationId: attempt.user.organizationId,
    kind: "RESULT",
    variables: [firstName(recipientName), firstName(attempt.user.name), attempt.test.title, score, link],
    reportUrl: link,
  });

  const items: { recipient: Recipient; message: OutgoingMessage }[] = [];
  if (toStudent) items.push({ recipient: toRecipient(attempt.user), message: message(attempt.user.name) });
  if (toParents) for (const { parent } of attempt.user.studentLinks) items.push({ recipient: toRecipient(parent), message: message(parent.name) });

  const results = await notifyMany(items);
  return {
    recipients: items.length,
    sent: results.filter((r) => r.whatsapp === "SENT" || r.sms === "SENT").length,
    link,
  };
}

/** Tell the students who can see a newly published test that it's available. */
export async function sendTestAssigned(testId: string, baseUrl: string) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { title: true, organizationId: true, isPublished: true, ownerId: true, scheduledStart: true, scheduledEnd: true, batches: { select: { id: true } } },
  });
  if (!test || !test.isPublished || test.ownerId || !test.organizationId) return { recipients: 0 };

  const org = await prisma.organization.findUnique({ where: { id: test.organizationId }, select: { whatsappConfig: true } });
  if (!parseConfig(org?.whatsappConfig).rules.testAssigned) return { recipients: 0 };

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      status: "APPROVED",
      organizationId: test.organizationId,
      ...(test.batches.length ? { batchId: { in: test.batches.map((b) => b.id) } } : {}),
    },
    select: recipientFields,
  });

  const fmt = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const window = [test.scheduledStart ? `opens ${fmt(test.scheduledStart)}` : "", test.scheduledEnd ? `closes ${fmt(test.scheduledEnd)}` : ""].filter(Boolean).join(", ") || "available now";
  const link = `${baseUrl}/student/mocks`;

  await notifyMany(
    students.map((s) => ({
      recipient: toRecipient(s),
      message: { organizationId: test.organizationId, kind: "TEST_ASSIGNED" as const, variables: [firstName(s.name), test.title, window, link], reportUrl: link },
    }))
  );
  return { recipients: students.length };
}

/**
 * Weekly digest to parents (and the student): tests taken, average, streak and active days.
 * Students with no activity at all still get a nudge, since that's exactly what parents need to know.
 */
export async function sendWeeklyDigests(baseUrl = appBaseUrl()) {
  const orgs = await prisma.organization.findMany({ select: { id: true, whatsappConfig: true } });
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let recipients = 0;

  for (const org of orgs) {
    if (!parseConfig(org.whatsappConfig).rules.weeklyDigest) continue;

    const students = await prisma.user.findMany({
      where: { role: "STUDENT", status: "APPROVED", organizationId: org.id },
      select: {
        ...recipientFields,
        studentLinks: { select: { parent: { select: recipientFields } } },
        studyLogs: { select: { day: true, questions: true, reviews: true } },
        attempts: {
          where: { status: { in: ["COMPLETED", "AUTO_SUBMITTED"] }, isRetry: false, endTime: { gte: since } },
          select: { percentage: true },
        },
      },
    });

    const items: { recipient: Recipient; message: OutgoingMessage }[] = [];
    for (const s of students) {
      const week = s.studyLogs.filter((l) => l.day >= dayKey(since));
      const questions = week.reduce((n, l) => n + l.questions + l.reviews, 0);
      const avg = s.attempts.length ? Math.round(s.attempts.reduce((n, a) => n + (a.percentage ?? 0), 0) / s.attempts.length) : null;
      const streak = computeStreak(s.studyLogs.map((l) => l.day)).current;
      const summary = s.attempts.length || questions
        ? `${s.attempts.length} test${s.attempts.length === 1 ? "" : "s"}${avg !== null ? ` (avg ${avg}%)` : ""}, ${questions} questions practised, active ${week.length}/7 days, ${streak}-day streak`
        : "no tests or practice this week";

      const link = `${baseUrl}/login`;
      const msg = (name: string): OutgoingMessage => ({
        organizationId: org.id,
        kind: "WEEKLY_REPORT",
        variables: [firstName(name), firstName(s.name), summary, link],
        reportUrl: link,
      });
      for (const { parent } of s.studentLinks) items.push({ recipient: toRecipient(parent), message: msg(parent.name) });
      items.push({ recipient: toRecipient(s), message: msg(s.name) });
    }
    await notifyMany(items);
    recipients += items.length;
  }
  return { recipients };
}

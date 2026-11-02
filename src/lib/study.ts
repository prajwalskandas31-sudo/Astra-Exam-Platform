// Study habits: daily activity log, streaks and spaced-repetition scheduling of missed questions.

import { prisma } from "./prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar day key (UTC) used by StudyLog rows. */
export const dayKey = (d: Date = new Date()) => d.toISOString().slice(0, 10);

/** Add questions answered and/or review cards completed to today's log. */
export async function logStudy(userId: string, { questions = 0, reviews = 0 }: { questions?: number; reviews?: number }) {
  if (questions <= 0 && reviews <= 0) return;
  const day = dayKey();
  await prisma.studyLog.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, questions, reviews },
    update: { questions: { increment: questions }, reviews: { increment: reviews } },
  });
}

/**
 * Consecutive active days ending today. If nothing has been done yet today,
 * the streak still counts up to yesterday so it isn't "lost" before the day is over.
 */
export function computeStreak(activeDays: Iterable<string>, today: Date = new Date()): { current: number; best: number } {
  const days = new Set(activeDays);
  let cursor = today.getTime();
  if (!days.has(dayKey(today))) cursor -= DAY_MS;
  let current = 0;
  while (days.has(dayKey(new Date(cursor)))) {
    current++;
    cursor -= DAY_MS;
  }

  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of sorted) {
    const t = Date.parse(`${d}T00:00:00Z`);
    run = prev !== null && t - prev === DAY_MS ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return { current, best: Math.max(best, current) };
}

export const REVIEW_GRADES = ["AGAIN", "HARD", "GOOD", "EASY"] as const;
export type ReviewGrade = (typeof REVIEW_GRADES)[number];

interface CardState {
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
}

/** SM-2 variant: returns the card's next state and when it is due again. */
export function scheduleReview(card: CardState, grade: ReviewGrade, now: Date = new Date()) {
  let { ease, intervalDays, repetitions, lapses } = card;

  if (grade === "AGAIN") {
    repetitions = 0;
    lapses += 1;
    intervalDays = 0; // see it again later today
    ease = Math.max(1.3, ease - 0.2);
  } else {
    const quality = grade === "HARD" ? 3 : grade === "GOOD" ? 4 : 5;
    ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    if (repetitions === 0) intervalDays = grade === "EASY" ? 3 : 1;
    else if (repetitions === 1) intervalDays = grade === "HARD" ? 3 : 6;
    else intervalDays = Math.round(intervalDays * (grade === "HARD" ? 1.2 : ease) * (grade === "EASY" ? 1.3 : 1));
    intervalDays = Math.min(intervalDays, 365);
    repetitions += 1;
  }

  // "Again" comes back in 10 minutes; everything else at the start of the due day
  const dueAt = intervalDays === 0 ? new Date(now.getTime() + 10 * 60 * 1000) : new Date(now.getTime() + intervalDays * DAY_MS);
  return { ease: Math.round(ease * 100) / 100, intervalDays, repetitions, lapses, dueAt };
}

/**
 * Put missed questions into the student's review queue. A question already in the
 * queue is reset so it comes up again soon, since the student just got it wrong again.
 */
export async function queueForReview(userId: string, questionIds: string[]) {
  const ids = [...new Set(questionIds)];
  if (ids.length === 0) return;
  const now = new Date();
  await prisma.$transaction(
    ids.map((questionId) =>
      prisma.reviewItem.upsert({
        where: { userId_questionId: { userId, questionId } },
        create: { userId, questionId, dueAt: now },
        update: { dueAt: now, repetitions: 0, intervalDays: 0 },
      })
    )
  );
}

/** Whole days from today until the given date (negative once it has passed). */
export function daysUntil(date: Date | null | undefined, now: Date = new Date()) {
  if (!date) return null;
  const start = Date.parse(`${dayKey(now)}T00:00:00Z`);
  const end = Date.parse(`${dayKey(date)}T00:00:00Z`);
  return Math.round((end - start) / DAY_MS);
}

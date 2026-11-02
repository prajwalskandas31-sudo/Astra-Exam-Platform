import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, tenantOrGlobalWhere } from "@/lib/api";
import { DIFFICULTIES } from "@/lib/questions";

const SOURCES = ["ALL", "UNSEEN", "INCORRECT"] as const;
type Source = (typeof SOURCES)[number];

const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Subjects → topics with question counts, plus how many the student has seen or got wrong. */
export async function GET() {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const [questions, answers] = await Promise.all([
      prisma.question.findMany({
        where: { status: "PUBLISHED", ...tenantOrGlobalWhere(session) },
        select: { id: true, subject: true, topic: true, difficulty: true },
      }),
      prisma.answer.findMany({
        where: { attempt: { userId: session.user.id, status: { in: ["COMPLETED", "AUTO_SUBMITTED"] } }, selectedOpt: { not: null } },
        select: { questionId: true, isCorrect: true },
      }),
    ]);

    const seen = new Set(answers.map((a) => a.questionId));
    const subjects = new Map<string, { name: string; total: number; unseen: number; topics: Map<string, number> }>();
    for (const q of questions) {
      const s = subjects.get(q.subject) ?? { name: q.subject, total: 0, unseen: 0, topics: new Map() };
      s.total++;
      if (!seen.has(q.id)) s.unseen++;
      s.topics.set(q.topic, (s.topics.get(q.topic) ?? 0) + 1);
      subjects.set(q.subject, s);
    }

    return NextResponse.json({
      totalQuestions: questions.length,
      unseen: questions.filter((q) => !seen.has(q.id)).length,
      incorrect: new Set(answers.filter((a) => a.isCorrect === false).map((a) => a.questionId)).size,
      subjects: [...subjects.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({ name: s.name, total: s.total, unseen: s.unseen, topics: [...s.topics.entries()].sort().map(([name, count]) => ({ name, count })) })),
    });
  } catch (error) {
    console.error("[CUSTOM_PRACTICE_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/**
 * Build a private quiz from the question bank and start it straight away.
 * Body: { subjects?: string[], topics?: string[], difficulty?: "EASY"|"MEDIUM"|"HARD"|"ANY",
 *         source?: "ALL"|"UNSEEN"|"INCORRECT", count: 5–100, timed?: boolean }
 */
export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;

    const body = await request.json();
    const count = Number(body.count);
    if (!Number.isInteger(count) || count < 5 || count > 100) return jsonError("Choose between 5 and 100 questions");
    const source: Source = SOURCES.includes(body.source) ? body.source : "ALL";
    const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : []);
    const subjects = strings(body.subjects);
    const topics = strings(body.topics);
    const difficulty = (DIFFICULTIES as readonly string[]).includes(body.difficulty) ? (body.difficulty as string) : null;

    const where: Prisma.QuestionWhereInput = { status: "PUBLISHED", ...tenantOrGlobalWhere(session) };
    if (subjects.length) where.subject = { in: subjects };
    if (topics.length) where.topic = { in: topics };
    if (difficulty) where.difficulty = difficulty;

    if (source !== "ALL") {
      const answers = await prisma.answer.findMany({
        where: { attempt: { userId: session.user.id, status: { in: ["COMPLETED", "AUTO_SUBMITTED"] } }, selectedOpt: { not: null } },
        select: { questionId: true, isCorrect: true },
      });
      if (source === "UNSEEN") {
        where.id = { notIn: [...new Set(answers.map((a) => a.questionId))] };
      } else {
        where.id = { in: [...new Set(answers.filter((a) => a.isCorrect === false).map((a) => a.questionId))] };
      }
    }

    const pool = await prisma.question.findMany({ where, select: { id: true, marks: true, subject: true, estimatedTime: true } });
    if (pool.length === 0) {
      return jsonError(
        source === "UNSEEN" ? "You've already seen every question matching these filters." :
        source === "INCORRECT" ? "No previously-missed questions match these filters." :
        "No questions match these filters."
      );
    }

    const picked = shuffle(pool).slice(0, count);
    // Timed quizzes use each question's estimated time; untimed ones get a generous 3 hours
    const seconds = body.timed === false ? 180 * 60 : Math.max(5 * 60, picked.reduce((s, q) => s + (q.estimatedTime || 60), 0));
    const label = topics.length === 1 ? topics[0] : subjects.length === 1 ? subjects[0] : "Mixed";

    const test = await prisma.test.create({
      data: {
        title: `Custom quiz · ${label} · ${picked.length} Qs`,
        description: `Built by the student${difficulty ? ` · ${difficulty.toLowerCase()}` : ""}${source !== "ALL" ? ` · ${source.toLowerCase()} questions` : ""}`,
        duration: Math.ceil(seconds / 60),
        totalMarks: Math.round(picked.reduce((s, q) => s + (q.marks || 1), 0)),
        type: "PRACTICE",
        mode: "CBT",
        status: "ACTIVE",
        isPublished: false,
        ownerId: session.user.id,
        organizationId: session.user.organizationId ?? null,
        questions: { create: picked.map((q, i) => ({ questionId: q.id, order: i, section: q.subject })) },
      },
    });

    // Unranked practice, like a retest: answers are pre-seeded so the attempt covers exactly these questions
    const attempt = await prisma.attempt.create({
      data: {
        userId: session.user.id,
        testId: test.id,
        mode: "CBT",
        status: "IN_PROGRESS",
        timeRemaining: test.duration * 60,
        isRetry: true,
        answers: { create: picked.map((q) => ({ questionId: q.id, status: "NOT_VISITED", timeSpent: 0 })) },
      },
    });

    return NextResponse.json({ attemptId: attempt.id, questionCount: picked.length, available: pool.length });
  } catch (error) {
    console.error("[CUSTOM_PRACTICE_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

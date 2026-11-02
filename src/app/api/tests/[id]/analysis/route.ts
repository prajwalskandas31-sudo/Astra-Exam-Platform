import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole, tenantOrGlobalWhere } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";
import { parseOptions } from "@/lib/questions";

const round1 = (n: number) => Math.round(n * 10) / 10;
const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Quote cells with separators, and neutralise spreadsheet formula injection
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/**
 * Staff: results and item analysis for one test.
 * Each student's best first-time attempt is used. ?format=csv downloads the results table.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;
    const { id } = await params;

    const test = await prisma.test.findFirst({
      where: { id, ownerId: null, ...tenantOrGlobalWhere(session) },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { question: { select: { id: true, text: true, options: true, correctOption: true, subject: true, topic: true, difficulty: true, questionType: true } } },
        },
      },
    });
    if (!test) return jsonError("Test not found", 404);

    // Institute staff only see their own students' attempts on shared/global tests
    const userScope = session.user.role === "SUPER_ADMIN" ? {} : { organizationId: session.user.organizationId ?? "__none__" };
    const attempts = await prisma.attempt.findMany({
      where: { testId: id, isRetry: false, status: { in: ["COMPLETED", "AUTO_SUBMITTED"] }, user: userScope },
      include: {
        user: { select: { id: true, name: true, email: true, batch: { select: { name: true } } } },
        answers: { select: { questionId: true, selectedOpt: true, isCorrect: true, timeSpent: true } },
        _count: { select: { violations: true } },
      },
    });

    const best = new Map<string, (typeof attempts)[number]>();
    for (const a of attempts) {
      const cur = best.get(a.userId);
      if (!cur || (a.score ?? 0) > (cur.score ?? 0)) best.set(a.userId, a);
    }
    const field = [...best.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const links = await prisma.reportLink.findMany({
      where: { attemptId: { in: field.map((a) => a.id) } },
      select: { attemptId: true, clicks: true, lastOpenedAt: true },
    });
    const opened = new Map<string, { clicks: number; lastOpenedAt: Date | null }>();
    for (const l of links) {
      const cur = opened.get(l.attemptId);
      opened.set(l.attemptId, { clicks: (cur?.clicks ?? 0) + l.clicks, lastOpenedAt: l.lastOpenedAt ?? cur?.lastOpenedAt ?? null });
    }

    const results = field.map((a) => ({
      attemptId: a.id,
      rank: field.findIndex((x) => (x.score ?? 0) === (a.score ?? 0)) + 1,
      student: a.user.name,
      email: a.user.email,
      batch: a.user.batch?.name ?? "—",
      score: round1(a.score ?? 0),
      percentage: round1(a.percentage ?? 0),
      accuracy: round1(a.accuracy ?? 0),
      correct: a.correctCount ?? 0,
      incorrect: a.incorrectCount ?? 0,
      skipped: a.unattemptedCount ?? 0,
      timeTaken: a.endTime ? Math.round((a.endTime.getTime() - a.startTime.getTime()) / 1000) : null,
      violations: a._count.violations,
      status: a.status,
      submittedAt: a.endTime ?? a.updatedAt,
      // null = no report link sent yet; 0 = sent but not opened
      reportOpens: opened.has(a.id) ? opened.get(a.id)!.clicks : null,
    }));

    if (new URL(request.url).searchParams.get("format") === "csv") {
      const header = ["Rank", "Student", "Email", "Batch", "Score", "Max marks", "Percentage", "Accuracy", "Correct", "Incorrect", "Skipped", "Time (min)", "Violations", "Status", "Submitted", "Report opens"];
      const lines = results.map((r) => [
        r.rank, r.student, r.email, r.batch, r.score, test.totalMarks, r.percentage, r.accuracy, r.correct, r.incorrect, r.skipped,
        r.timeTaken != null ? round1(r.timeTaken / 60) : "", r.violations, r.status, new Date(r.submittedAt).toISOString(), r.reportOpens ?? "not sent",
      ].map(csvCell).join(","));
      const filename = `${test.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-results.csv`;
      return new NextResponse([header.join(","), ...lines].join("\n"), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` },
      });
    }

    // Item analysis: difficulty (p-value), discrimination (upper vs lower 27%) and distractor spread
    const groupSize = Math.max(1, Math.round(field.length * 0.27));
    const upper = new Set(field.slice(0, groupSize).map((a) => a.id));
    const lower = new Set(field.slice(-groupSize).map((a) => a.id));
    const answerMaps = field.map((a) => ({ id: a.id, byQ: new Map(a.answers.map((x) => [x.questionId, x])) }));

    const items = test.questions.map((tq, index) => {
      const q = tq.question;
      let correct = 0, attempted = 0, time = 0, upperCorrect = 0, lowerCorrect = 0;
      const distribution: Record<string, number> = {};
      for (const { id: attemptId, byQ } of answerMaps) {
        const ans = byQ.get(q.id);
        time += ans?.timeSpent ?? 0;
        if (ans?.selectedOpt) {
          attempted++;
          for (const opt of q.questionType === "NUMERICAL" ? [ans.selectedOpt.trim()] : ans.selectedOpt.split(",").map((s) => s.trim().toUpperCase())) {
            if (opt) distribution[opt] = (distribution[opt] ?? 0) + 1;
          }
        }
        if (ans?.isCorrect) {
          correct++;
          if (upper.has(attemptId)) upperCorrect++;
          if (lower.has(attemptId)) lowerCorrect++;
        }
      }
      const n = field.length;
      const pCorrect = n ? (correct / n) * 100 : 0;
      const discrimination = n >= 4 ? round1((upperCorrect - lowerCorrect) / groupSize) : null;
      const flags: string[] = [];
      if (n >= 4) {
        if (pCorrect < 20) flags.push("Very hard");
        if (pCorrect > 90) flags.push("Very easy");
        if (discrimination !== null && discrimination < 0) flags.push("Negative discrimination — check the answer key");
        else if (discrimination !== null && discrimination < 0.2) flags.push("Poor discrimination");
      }
      return {
        number: index + 1,
        id: q.id,
        text: q.text,
        subject: q.subject,
        topic: q.topic,
        difficulty: q.difficulty,
        questionType: q.questionType,
        correctOption: q.correctOption,
        options: parseOptions(q.options).map((o) => o.id),
        pctCorrect: Math.round(pCorrect),
        pctAttempted: n ? Math.round((attempted / n) * 100) : 0,
        avgTime: n ? Math.round(time / n) : 0,
        discrimination,
        distribution,
        flags,
      };
    });

    const pcts = results.map((r) => r.percentage).sort((a, b) => a - b);
    const median = pcts.length ? (pcts.length % 2 ? pcts[(pcts.length - 1) / 2] : (pcts[pcts.length / 2 - 1] + pcts[pcts.length / 2]) / 2) : 0;

    return NextResponse.json({
      test: { id: test.id, title: test.title, type: test.type, mode: test.mode, duration: test.duration, totalMarks: test.totalMarks, isPublished: test.isPublished, questionCount: test.questions.length },
      summary: {
        participants: field.length,
        average: pcts.length ? round1(pcts.reduce((s, x) => s + x, 0) / pcts.length) : 0,
        median: round1(median),
        highest: pcts.length ? pcts[pcts.length - 1] : 0,
        lowest: pcts.length ? pcts[0] : 0,
        // Score distribution in 10% bands
        bands: Array.from({ length: 10 }, (_, i) => ({
          label: `${i * 10}–${i * 10 + 10}%`,
          count: pcts.filter((p) => (i === 9 ? p >= 90 : p >= i * 10 && p < i * 10 + 10)).length,
        })),
      },
      results,
      items,
    });
  } catch (error) {
    console.error("[TEST_ANALYSIS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

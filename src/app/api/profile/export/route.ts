import { prisma } from "@/lib/prisma";
import { requireRole, safeJson } from "@/lib/api";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";

/**
 * "Download my data" (DPDP Act right of access): everything the platform holds about the signed-in
 * user, as one JSON file. Secrets (password hash, session id) are never included.
 */
export async function GET() {
  try {
    const { session, error } = await requireRole();
    if (error) return error;
    const userId = session.user.id;
    const limited = await rateLimit(`export:${userId}`, 5, 60 * 60);
    if (!limited.ok) return tooManyRequests(limited.retryAfter, "You can download your data 5 times an hour. Please try again later.");

    const [user, attempts, bookmarks, reviewItems, studyLogs, questionReports, requests, links] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, email: true, phone: true, role: true, status: true, examTracks: true, targetExamDate: true,
          dailyGoal: true, notifyWhatsapp: true, notifySms: true, createdAt: true, updatedAt: true,
          organization: { select: { name: true } }, batch: { select: { name: true } },
        },
      }),
      prisma.attempt.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true, status: true, mode: true, score: true, percentage: true, accuracy: true, rank: true, percentile: true,
          correctCount: true, incorrectCount: true, unattemptedCount: true, subjectScores: true, weakTopics: true, strongTopics: true,
          startTime: true, endTime: true, isRetry: true, mentorComment: true,
          test: { select: { title: true } },
          answers: { select: { questionId: true, selectedOpt: true, isCorrect: true, timeSpent: true, status: true } },
          violations: { select: { type: true, timestamp: true } },
        },
      }),
      prisma.bookmark.findMany({ where: { userId }, select: { questionId: true, note: true, createdAt: true } }),
      prisma.reviewItem.findMany({ where: { userId }, select: { questionId: true, dueAt: true, repetitions: true, lapses: true, lastReviewedAt: true } }),
      prisma.studyLog.findMany({ where: { userId }, orderBy: { day: "asc" }, select: { day: true, questions: true, reviews: true } }),
      prisma.questionReport.findMany({ where: { userId }, select: { questionId: true, reason: true, details: true, status: true, createdAt: true } }),
      prisma.testRequest.findMany({ where: { userId }, select: { count: true, category: true, examCategory: true, notes: true, status: true, createdAt: true } }),
      prisma.parentStudentLink.findMany({
        where: { OR: [{ parentId: userId }, { studentId: userId }] },
        select: { parent: { select: { name: true, email: true } }, student: { select: { name: true, email: true } }, createdAt: true },
      }),
    ]);
    if (!user) return Response.json({ error: "Not found" }, { status: 404 });

    const body = {
      exportedAt: new Date().toISOString(),
      profile: { ...user, examTracks: safeJson<string[]>(user.examTracks, []) },
      attempts: attempts.map((a) => ({
        ...a,
        subjectScores: safeJson(a.subjectScores, {}),
        weakTopics: safeJson(a.weakTopics, []),
        strongTopics: safeJson(a.strongTopics, []),
      })),
      bookmarks,
      reviewQueue: reviewItems,
      studyLog: studyLogs,
      questionReports,
      testRequests: requests,
      linkedAccounts: links,
    };

    const date = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(body, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="astra-my-data-${date}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[PROFILE_EXPORT]", error);
    return Response.json({ error: "Internal Error" }, { status: 500 });
  }
}

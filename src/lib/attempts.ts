import type { Session } from "next-auth";
import { prisma } from "./prisma";
import { isStaff } from "./roles";

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

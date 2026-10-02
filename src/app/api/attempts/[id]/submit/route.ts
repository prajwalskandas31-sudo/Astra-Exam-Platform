import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications";
import { generateReportToken } from "@/lib/reportTokens";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            studentLinks: {
              include: { parent: true }
            }
          }
        },
        test: {
          include: {
            questions: {
              include: { question: true }
            }
          }
        },
        answers: {
          include: { question: true }
        }
      }
    });

    if (!attempt || attempt.userId !== session.user.id) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (attempt.status === "COMPLETED" || attempt.status === "AUTO_SUBMITTED") {
      return NextResponse.json(attempt);
    }

    const testQuestions = attempt.test.questions;

    let totalScore = 0;
    let maxPossibleMarks = 0;
    let attemptedCount = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;

    const subjectData: Record<string, { total: number; correct: number; incorrect: number; score: number; maxScore: number }> = {};
    const chapterData: Record<string, { total: number; correct: number; incorrect: number; score: number }> = {};
    const topicData: Record<string, { total: number; correct: number; incorrect: number; score: number }> = {};

    for (const tq of testQuestions) {
      const q = tq.question;
      const qMarks = q.marks || 1;
      const qNeg = q.negativeMarks || 0;
      const subj = q.subject || "General";
      const chap = q.chapter || "General";
      const top = q.topic || "General";

      maxPossibleMarks += qMarks;

      if (!subjectData[subj]) subjectData[subj] = { total: 0, correct: 0, incorrect: 0, score: 0, maxScore: 0 };
      if (!chapterData[chap]) chapterData[chap] = { total: 0, correct: 0, incorrect: 0, score: 0 };
      if (!topicData[top]) topicData[top] = { total: 0, correct: 0, incorrect: 0, score: 0 };

      subjectData[subj].total++;
      subjectData[subj].maxScore += qMarks;
      chapterData[chap].total++;
      topicData[top].total++;

      const studentAnswer = attempt.answers.find((a) => a.questionId === q.id);

      if (studentAnswer && studentAnswer.selectedOpt) {
        attemptedCount++;
        const isCorrect = studentAnswer.selectedOpt === q.correctOption;

        if (isCorrect) {
          correctCount++;
          totalScore += qMarks;
          subjectData[subj].correct++;
          subjectData[subj].score += qMarks;
          chapterData[chap].correct++;
          chapterData[chap].score += qMarks;
          topicData[top].correct++;
          topicData[top].score += qMarks;
        } else {
          incorrectCount++;
          totalScore -= qNeg;
          subjectData[subj].incorrect++;
          subjectData[subj].score -= qNeg;
          chapterData[chap].incorrect++;
          chapterData[chap].score -= qNeg;
          topicData[top].incorrect++;
          topicData[top].score -= qNeg;
        }

        await prisma.answer.update({
          where: { id: studentAnswer.id },
          data: {
            isCorrect,
            status: "SAVED",
            subject: subj,
            chapter: chap,
            topic: top
          }
        });
      } else {
        unattemptedCount++;
      }
    }

    const percentage = maxPossibleMarks > 0 ? (totalScore / maxPossibleMarks) * 100 : 0;
    const accuracy = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;

    // Weak and Strong topic identification
    const weakTopicsList: string[] = [];
    const strongTopicsList: string[] = [];

    Object.entries(topicData).forEach(([topName, stats]) => {
      const topAccuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      if (topAccuracy < 60) {
        weakTopicsList.push(topName);
      } else if (topAccuracy >= 80) {
        strongTopicsList.push(topName);
      }
    });

    // Calculate Rank
    const higherScoreAttemptsCount = await prisma.attempt.count({
      where: {
        testId: attempt.testId,
        status: { in: ["COMPLETED", "AUTO_SUBMITTED"] },
        score: { gt: totalScore }
      }
    });
    const rank = higherScoreAttemptsCount + 1;

    // Update Attempt with complete metrics
    const updatedAttempt = await prisma.attempt.update({
      where: { id },
      data: {
        status: "COMPLETED",
        score: totalScore,
        percentage,
        accuracy,
        attemptedCount,
        correctCount,
        incorrectCount,
        unattemptedCount,
        rank,
        subjectScores: JSON.stringify(subjectData),
        chapterScores: JSON.stringify(chapterData),
        topicScores: JSON.stringify(topicData),
        weakTopics: JSON.stringify(weakTopicsList),
        strongTopics: JSON.stringify(strongTopicsList),
        endTime: new Date()
      }
    });

    // Generate encrypted report URL for notification
    const reportToken = generateReportToken(attempt.id, attempt.userId);
    const domain = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const reportUrl = `${domain}/report/${reportToken}`;

    // Dispatch WhatsApp notifications to linked parents & student
    if (attempt.user.phone) {
      await NotificationService.sendNotification({
        recipientPhone: attempt.user.phone,
        recipientName: attempt.user.name,
        type: "RESULT_NOTIFICATION",
        testTitle: attempt.test.title,
        score: totalScore,
        accuracy: Math.round(accuracy * 10) / 10,
        rank,
        reportUrl
      }).catch(console.error);
    }

    if (attempt.user.studentLinks) {
      for (const link of attempt.user.studentLinks) {
        if (link.parent.phone) {
          await NotificationService.sendNotification({
            recipientPhone: link.parent.phone,
            recipientName: link.parent.name,
            type: "RESULT_NOTIFICATION",
            testTitle: attempt.test.title,
            score: totalScore,
            accuracy: Math.round(accuracy * 10) / 10,
            rank,
            reportUrl
          }).catch(console.error);
        }
      }
    }

    return NextResponse.json(updatedAttempt);
  } catch (error) {
    console.error("[SUBMIT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

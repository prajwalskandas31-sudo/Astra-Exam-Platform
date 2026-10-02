import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReportToken } from "@/lib/reportTokens";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["ADMIN", "MENTOR", "FACULTY", "SUPER_ADMIN"].includes(session.user.role)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { attemptId, channel = "WHATSAPP" } = await req.json();

    if (!attemptId) {
      return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
    }

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        user: {
          include: {
            parentLinks: {
              include: { parent: true }
            }
          }
        },
        test: true
      }
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Generate secure token valid for 30 days
    const token = generateReportToken(attempt.id, attempt.userId);
    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const reportUrl = `${origin}/report/${token}`;

    const parentPhones = attempt.user.parentLinks
      .map((link) => link.parent.phone)
      .filter(Boolean);

    const recipientPhone = parentPhones.length > 0 ? parentPhones[0] : attempt.user.phone || "+91 9876543210";

    const payloadText = JSON.stringify({
      studentName: attempt.user.name,
      testTitle: attempt.test.title,
      score: attempt.score,
      totalMarks: attempt.test.totalMarks,
      accuracy: attempt.accuracy,
      rank: attempt.rank || 1,
      reportUrl,
      channel
    });

    // Save notification log in database
    const notificationLog = await prisma.notificationLog.create({
      data: {
        recipientPhone: recipientPhone || "N/A",
        type: channel === "WHATSAPP" ? "RESULT_NOTIFICATION_WHATSAPP" : "RESULT_NOTIFICATION_EMAIL",
        status: "SENT",
        payload: payloadText,
        reportUrl: reportUrl
      }
    });

    return NextResponse.json({
      success: true,
      reportUrl,
      notificationLog,
      recipientPhone,
      studentName: attempt.user.name,
      testTitle: attempt.test.title,
      message: `Report card successfully dispatched to parent via ${channel}!`
    });

  } catch (error) {
    console.error("[DISPATCH_REPORT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

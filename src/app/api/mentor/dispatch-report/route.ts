import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";
import { canViewAttempt, isFinished } from "@/lib/attempts";
import { generateReportToken } from "@/lib/reportTokens";
import { NotificationService } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const { attemptId, channel = "WHATSAPP" } = await req.json();
    if (!attemptId) {
      return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
    }

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        // A student's parents are reached through `studentLinks` (the student side of the link)
        user: { include: { studentLinks: { include: { parent: true } } } },
        test: true
      }
    });

    if (!attempt || !(await canViewAttempt(session, attempt))) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    if (!isFinished(attempt.status)) {
      return NextResponse.json({ error: "This attempt hasn't been submitted yet" }, { status: 400 });
    }

    const parentPhones = attempt.user.studentLinks.map((l) => l.parent.phone).filter((p): p is string => !!p);
    const recipientPhone = parentPhones[0] || attempt.user.phone;
    if (!recipientPhone) {
      return NextResponse.json({ error: "No parent or student phone number on file" }, { status: 400 });
    }

    const token = generateReportToken(attempt.id, attempt.userId);
    const origin = process.env.NEXTAUTH_URL || req.headers.get("origin") || new URL(req.url).origin;
    const reportUrl = `${origin}/report/${token}`;

    const { logId } = await NotificationService.sendNotification({
      recipientPhone,
      recipientName: attempt.user.studentLinks[0]?.parent.name || attempt.user.name,
      type: "RESULT_NOTIFICATION",
      testTitle: attempt.test.title,
      score: attempt.score ?? 0,
      accuracy: attempt.accuracy ?? 0,
      rank: attempt.rank ?? undefined,
      reportUrl,
      channel: channel === "EMAIL" ? "EMAIL" : "WHATSAPP",
      organizationId: attempt.user.organizationId
    });

    return NextResponse.json({
      success: true,
      reportUrl,
      logId,
      recipientPhone,
      studentName: attempt.user.name,
      testTitle: attempt.test.title,
      message: `Report card sent to ${recipientPhone} via ${channel === "EMAIL" ? "email" : "WhatsApp"}`
    });
  } catch (error) {
    console.error("[DISPATCH_REPORT_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

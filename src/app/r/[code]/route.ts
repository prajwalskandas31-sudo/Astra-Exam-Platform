import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReportToken } from "@/lib/reportTokens";

/** Short report link from WhatsApp/SMS: count the open, then show the report card. */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const link = /^[A-Za-z0-9]{6,16}$/.test(code) ? await prisma.reportLink.findUnique({ where: { code } }) : null;
  const origin = new URL(request.url).origin;

  if (!link || link.expiresAt < new Date()) {
    // The report page renders a friendly "invalid or expired link" message for a bad token
    return NextResponse.redirect(new URL("/report/expired", origin));
  }

  await prisma.reportLink.update({ where: { code }, data: { clicks: { increment: 1 }, lastOpenedAt: new Date() } });
  return NextResponse.redirect(new URL(`/report/${generateReportToken(link.attemptId, link.studentId)}`, origin));
}

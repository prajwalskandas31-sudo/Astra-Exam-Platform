import { NextResponse } from "next/server";
import { sendWeeklyDigests } from "@/lib/messaging/automations";
import { appBaseUrl } from "@/lib/reportLinks";

// Large institutes can take a while: one message per parent and student
export const maxDuration = 300;

/**
 * Weekly WhatsApp/SMS digest for parents and students, triggered by Vercel Cron
 * (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await sendWeeklyDigests(appBaseUrl(request));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[CRON_WEEKLY_DIGEST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

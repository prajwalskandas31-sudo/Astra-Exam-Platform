import { NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/reportLinks";
import { drainOfflineQueue } from "@/lib/offlineSubmissions";

export const maxDuration = 300;

/**
 * Safety net for offline answer sheets: every upload already starts a grading drain, and the
 * invigilator console can force one; this daily run catches anything left behind.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await drainOfflineQueue({ budgetMs: 240_000, force: true, baseUrl: appBaseUrl(request) });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[CRON_OFFLINE_GRADE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

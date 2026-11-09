import { NextResponse, after } from "next/server";
import { requireRole } from "@/lib/api";
import { audit } from "@/lib/audit";
import { isStaff } from "@/lib/roles";
import { appBaseUrl } from "@/lib/reportLinks";
import { drainOfflineQueue, receiveSheet } from "@/lib/offlineSubmissions";

export const maxDuration = 300;

const MAX_SHEETS = 500;

/**
 * Final offline answer sheets. Body: one sheet, or { sheets: [...] } (staff uploading the
 * answer files exported from devices). Each sheet is stored and acknowledged immediately
 * (202); grading runs afterwards in the background queue, so a whole centre reconnecting at
 * once costs one small insert per student.
 */
export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole();
    if (error) return error;
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const staff = isStaff(session.user.role);
    if (!staff && session.user.role !== "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const sheets: unknown[] = Array.isArray(body.sheets) ? body.sheets.slice(0, MAX_SHEETS) : [body];
    if (sheets.length > 1 && !staff) return NextResponse.json({ error: "Upload one answer sheet at a time" }, { status: 400 });

    const results = [];
    for (const sheet of sheets) results.push(await receiveSheet(sheet, session.user, true));

    const baseUrl = appBaseUrl(request);
    after(() => drainOfflineQueue({ baseUrl }).catch((e) => console.error("[OFFLINE_DRAIN]", e)));

    if (staff) {
      const received = results.filter((r) => r.ok && r.status === "received").length;
      await audit(session, { action: "offline.upload", targetType: "Test", summary: `Uploaded ${sheets.length} offline answer sheet(s), ${received} new` }, request);
      return NextResponse.json({ results }, { status: 202 });
    }
    const [result] = results;
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    console.error("[OFFLINE_SUBMIT]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

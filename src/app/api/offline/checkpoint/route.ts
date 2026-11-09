import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api";
import { receiveSheet } from "@/lib/offlineSubmissions";

/**
 * A running offline exam's checkpoint (sent every couple of minutes while the device has
 * internet): lets the invigilator see progress and lets the student resume elsewhere.
 */
export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(["STUDENT"]);
    if (error) return error;
    const body = await request.json().catch(() => null);
    const result = await receiveSheet(body, session.user, false);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[OFFLINE_CHECKPOINT]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

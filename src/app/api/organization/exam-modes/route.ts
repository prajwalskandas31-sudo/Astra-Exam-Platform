import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api";
import { STAFF_ROLES } from "@/lib/roles";
import { instituteExamModes } from "@/lib/examSettings";

/** Which opt-in exam modes this institute has switched on (staff screens show their settings only then). */
export async function GET() {
  const { session, error } = await requireRole(STAFF_ROLES);
  if (error) return error;
  return NextResponse.json(await instituteExamModes(session.user.organizationId));
}

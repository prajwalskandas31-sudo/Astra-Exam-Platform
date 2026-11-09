import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api";
import { audit } from "@/lib/audit";
import { ensureJoinCode, rotateJoinCode } from "@/lib/institutes";
import { appBaseUrl } from "@/lib/reportLinks";
import { STAFF_ROLES, ADMIN_ROLES } from "@/lib/roles";

/** Staff: the institute's sign-up link for students and parents. */
export async function GET(request: Request) {
  const { session, error } = await requireRole(STAFF_ROLES);
  if (error) return error;
  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "Your account isn't attached to an institute" }, { status: 400 });
  const code = await ensureJoinCode(orgId);
  return NextResponse.json({ code, url: `${appBaseUrl(request)}/join/${code}` });
}

/** Admin: issue a new code. Old links stop working (use if a link was shared too widely). */
export async function POST(request: Request) {
  const { session, error } = await requireRole(ADMIN_ROLES);
  if (error) return error;
  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "Your account isn't attached to an institute" }, { status: 400 });
  const code = await rotateJoinCode(orgId);
  await audit(session, { action: "organization.rotateJoinCode", targetType: "Organization", targetId: orgId, summary: "Issued a new student sign-up link (old link disabled)" }, request);
  return NextResponse.json({ code, url: `${appBaseUrl(request)}/join/${code}` });
}

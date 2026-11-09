import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantWhere } from "@/lib/api";
import { audit } from "@/lib/audit";
import { STAFF_ROLES } from "@/lib/roles";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;
    const { id } = await params;

    const { status } = await request.json();
    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json({ error: "status must be APPROVED or REJECTED" }, { status: 400 });
    }

    const existing = await prisma.testRequest.findFirst({ where: { id, user: tenantWhere(session) } });
    if (!existing) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const testRequest = await prisma.testRequest.update({ where: { id }, data: { status } });
    await audit(session, { action: `testRequest.${status.toLowerCase()}`, targetType: "TestRequest", targetId: id, summary: `${status === "APPROVED" ? "Approved" : "Rejected"} a request for ${existing.count} tests` }, request);
    return NextResponse.json(testRequest);
  } catch (error) {
    console.error("[REQUEST_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

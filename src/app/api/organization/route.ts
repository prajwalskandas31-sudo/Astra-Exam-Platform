import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, safeJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { ADMIN_ROLES } from "@/lib/roles";

const HEX = /^#[0-9a-fA-F]{6}$/;

async function ownOrg(organizationId?: string | null) {
  if (organizationId) return prisma.organization.findUnique({ where: { id: organizationId } });
  return prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function GET() {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;

    const org = await ownOrg(session.user.organizationId);
    if (!org) return NextResponse.json({ error: "No organization found" }, { status: 404 });

    const { whatsappConfig, ...rest } = org;
    const cfg = safeJson<{ provider?: string }>(whatsappConfig, {});
    return NextResponse.json({
      ...rest,
      offeredCategories: safeJson<string[]>(org.offeredCategories, []),
      // Never send provider secrets back to the browser
      whatsappProvider: cfg.provider || null
    });
  } catch (error) {
    console.error("[ORG_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;

    const org = await ownOrg(session.user.organizationId);
    if (!org) return NextResponse.json({ error: "No organization found" }, { status: 404 });

    const body = await request.json();
    const data: Record<string, unknown> = {};
    const text = (k: string, max = 200) => {
      if (typeof body[k] === "string") data[k] = body[k].trim().slice(0, max) || null;
    };

    if (typeof body.name === "string") {
      if (!body.name.trim()) return NextResponse.json({ error: "Institute name can't be empty" }, { status: 400 });
      data.name = body.name.trim().slice(0, 200);
    }
    text("logoUrl", 500);
    text("contactEmail");
    text("contactPhone", 40);
    text("academicYear", 20);
    for (const k of ["primaryColor", "secondaryColor"]) {
      if (typeof body[k] === "string") {
        if (!HEX.test(body[k])) return NextResponse.json({ error: `${k} must be a hex colour like #2563eb` }, { status: 400 });
        data[k] = body[k];
      }
    }
    if (typeof body.customDomain === "string") {
      const domain = body.customDomain.trim().toLowerCase() || null;
      if (domain) {
        const taken = await prisma.organization.findFirst({ where: { customDomain: domain, id: { not: org.id } } });
        if (taken) return NextResponse.json({ error: "That domain is already in use" }, { status: 409 });
      }
      data.customDomain = domain;
    }
    if (Array.isArray(body.offeredCategories)) {
      data.offeredCategories = JSON.stringify(body.offeredCategories.filter((c: unknown) => typeof c === "string").slice(0, 30));
    }

    // Opt-in exam modes. Offline exams build on Exam Centre mode, so they switch together.
    if (typeof body.examCentreEnabled === "boolean") {
      data.examCentreEnabled = body.examCentreEnabled;
      if (!body.examCentreEnabled) data.offlineExamsEnabled = false;
    }
    if (typeof body.offlineExamsEnabled === "boolean") {
      data.offlineExamsEnabled = body.offlineExamsEnabled;
      if (body.offlineExamsEnabled) data.examCentreEnabled = true;
    }

    const updated = await prisma.organization.update({ where: { id: org.id }, data });
    const { whatsappConfig: _w, ...rest } = updated;
    const modes = ["examCentreEnabled", "offlineExamsEnabled"].filter((k) => k in data && data[k] !== org[k as keyof typeof org]);
    await audit(session, {
      action: modes.length ? "organization.exam_modes" : "organization.update",
      targetType: "Organization",
      targetId: updated.id,
      summary: modes.length
        ? `Exam Centre mode ${updated.examCentreEnabled ? "on" : "off"}, offline exams ${updated.offlineExamsEnabled ? "on" : "off"}`
        : "Updated institute branding/details",
    }, request);
    return NextResponse.json({ ...rest, offeredCategories: safeJson<string[]>(updated.offeredCategories, []) });
  } catch (error) {
    console.error("[ORG_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantOrGlobalWhere } from "@/lib/api";
import { audit } from "@/lib/audit";
import { STAFF_ROLES, isAdmin } from "@/lib/roles";

const RESOURCE_CATEGORIES = ["Notes", "Formula Sheets", "Previous Papers", "Videos", "Syllabus"] as const;

export async function GET() {
  try {
    const { session, error } = await requireRole();
    if (error) return error;

    const resources = await prisma.resource.findMany({
      where: tenantOrGlobalWhere(session),
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(resources);
  } catch (error) {
    console.error("[RESOURCES_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    // Only allow http(s) links so stored URLs can't run script when clicked
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "Enter a valid link, e.g. https://drive.google.com/…" }, { status: 400 });
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return NextResponse.json({ error: "Only http(s) links are allowed" }, { status: 400 });
    }

    const resource = await prisma.resource.create({
      data: {
        title,
        url: parsed.toString(),
        category: (RESOURCE_CATEGORIES as readonly string[]).includes(body.category) ? body.category : "Notes",
        subject: typeof body.subject === "string" ? body.subject.trim().slice(0, 60) || null : null,
        description: typeof body.description === "string" ? body.description.trim().slice(0, 500) || null : null,
        authorId: session.user.id,
        organizationId: session.user.organizationId ?? null
      },
      include: { author: { select: { id: true, name: true } } }
    });
    await audit(session, { action: "resource.create", targetType: "Resource", targetId: resource.id, summary: `Shared "${resource.title}"` }, request);
    return NextResponse.json(resource);
  } catch (error) {
    console.error("[RESOURCES_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { session, error } = await requireRole(STAFF_ROLES);
    if (error) return error;

    const id = new URL(request.url).searchParams.get("id");
    const existing = id ? await prisma.resource.findUnique({ where: { id } }) : null;
    const allowed = existing && (existing.authorId === session.user.id ||
      (isAdmin(session.user.role) && (session.user.role === "SUPER_ADMIN" || existing.organizationId === session.user.organizationId)));
    if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.resource.delete({ where: { id: existing.id } });
    await audit(session, { action: "resource.delete", targetType: "Resource", targetId: existing.id, summary: `Removed "${existing.title}"` }, request);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RESOURCES_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

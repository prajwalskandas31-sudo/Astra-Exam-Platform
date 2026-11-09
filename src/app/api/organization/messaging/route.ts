import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireRole } from "@/lib/api";
import { audit } from "@/lib/audit";
import { ADMIN_ROLES } from "@/lib/roles";
import { applyUpdate, maskConfig, parseConfig, serializeConfig } from "@/lib/messaging/config";
import { TEMPLATE_VARIABLES, notify, webhookUrl } from "@/lib/messaging";

async function ownOrg(organizationId?: string | null) {
  return organizationId ? prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true, whatsappConfig: true } }) : null;
}

/** Admin: this institute's WhatsApp/SMS settings (secrets masked) and the template variable reference. */
export async function GET() {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;
    const org = await ownOrg(session.user.organizationId);
    if (!org) return jsonError("Messaging is set up per institute; sign in as an institute admin", 404);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const people = { organizationId: org.id, status: "APPROVED" as const };
    const [stats, students, studentsNoPhone, parentsNoPhone, studentsNoParent] = await Promise.all([
      prisma.notificationLog.groupBy({ by: ["status"], where: { organizationId: org.id, createdAt: { gte: since } }, _count: true }),
      prisma.user.count({ where: { ...people, role: "STUDENT" } }),
      prisma.user.count({ where: { ...people, role: "STUDENT", phone: null } }),
      prisma.user.count({ where: { ...people, role: "PARENT", phone: null } }),
      prisma.user.count({ where: { ...people, role: "STUDENT", studentLinks: { none: {} } } }),
    ]);

    const config = parseConfig(org.whatsappConfig);
    return NextResponse.json({
      config: maskConfig(config),
      // Delivery-report URLs to paste into each provider's console (created on first save)
      webhooks: config.webhookSecret
        ? { twilio: webhookUrl("twilio", org.id, config.webhookSecret), meta: webhookUrl("meta", org.id, config.webhookSecret), msg91: webhookUrl("msg91", org.id, config.webhookSecret) }
        : null,
      templateVariables: TEMPLATE_VARIABLES,
      last30Days: Object.fromEntries(stats.map((s) => [s.status, s._count])),
      // Who these messages can't reach yet
      coverage: { students, studentsNoPhone, parentsNoPhone, studentsNoParent },
    });
  } catch (error) {
    console.error("[MESSAGING_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/** Admin: save settings. Blank or masked secrets keep the saved value. */
export async function PATCH(request: Request) {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;
    const org = await ownOrg(session.user.organizationId);
    if (!org) return jsonError("Messaging is set up per institute; sign in as an institute admin", 404);

    const next = applyUpdate(parseConfig(org.whatsappConfig), await request.json());

    // Catch half-finished setups before they cause silent failures
    if (next.whatsapp.provider === "META" && (!next.whatsapp.meta.phoneNumberId || !next.whatsapp.meta.accessToken)) {
      return jsonError("Meta WhatsApp needs a phone number ID and an access token");
    }
    if (next.whatsapp.provider === "TWILIO" && (!next.whatsapp.twilio.accountSid || !next.whatsapp.twilio.authToken || !next.whatsapp.twilio.from)) {
      return jsonError("Twilio WhatsApp needs an account SID, auth token and sender");
    }
    if (next.sms.provider === "TWILIO" && (!next.sms.twilio.accountSid || !next.sms.twilio.authToken || !next.sms.twilio.from)) {
      return jsonError("Twilio SMS needs an account SID, auth token and sender");
    }
    if (next.sms.provider === "MSG91" && !next.sms.msg91.authKey) return jsonError("MSG91 needs an auth key");

    await prisma.organization.update({ where: { id: org.id }, data: { whatsappConfig: serializeConfig(next) } });
    await audit(session, { action: "messaging.update", targetType: "Organization", summary: `WhatsApp: ${next.whatsapp.provider}, SMS: ${next.sms.provider}` }, request);
    return NextResponse.json({ config: maskConfig(next) });
  } catch (error) {
    console.error("[MESSAGING_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/** Admin: send a test message to a phone number. Body: { phone } */
export async function POST(request: Request) {
  try {
    const { session, error } = await requireRole(ADMIN_ROLES);
    if (error) return error;
    const org = await ownOrg(session.user.organizationId);
    if (!org) return jsonError("Messaging is set up per institute", 404);

    const { phone } = await request.json();
    if (typeof phone !== "string" || !phone.trim()) return jsonError("Enter a phone number");

    const outcome = await notify(
      { userId: session.user.id, name: session.user.name ?? "Admin", phone },
      { organizationId: org.id, kind: "TEST_MESSAGE", variables: [session.user.name?.split(" ")[0] ?? "there", org.name] }
    );
    const latest = await prisma.notificationLog.findMany({
      where: { organizationId: org.id, type: "TEST_MESSAGE" },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { channel: true, status: true, error: true },
    });
    return NextResponse.json({ outcome, details: latest });
  } catch (error) {
    console.error("[MESSAGING_TEST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

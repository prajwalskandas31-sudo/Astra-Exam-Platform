// Sends WhatsApp / SMS messages for an institute and records every outcome in NotificationLog.
// Nothing here throws: a failed or skipped message is logged with its reason so admins can see and retry it.

import { prisma } from "@/lib/prisma";
import { parseConfig, toE164, type MessageKind, type MessagingConfig } from "./config";
import { sendMetaWhatsapp, sendMsg91, sendTwilio, type SendResult } from "./providers";

/**
 * Template variables, in order. Approved WhatsApp / DLT templates must use the same
 * positions: {{1}}, {{2}}… (WhatsApp, Twilio) or VAR1, VAR2… (MSG91).
 */
export const TEMPLATE_VARIABLES: Record<MessageKind, string[]> = {
  RESULT: ["recipient name", "student name", "test title", "score (e.g. 42/60, 70%)", "report link"],
  TEST_ASSIGNED: ["recipient name", "test title", "when it opens / closes", "link"],
  WEEKLY_REPORT: ["recipient name", "student name", "week summary", "link"],
  PASSWORD_RESET: ["one-time code"],
  TEST_MESSAGE: ["recipient name", "institute name"],
};

/** Plain-text version, used for Twilio SMS and shown in the logs. */
export function renderText(kind: MessageKind, v: string[], institute: string): string {
  switch (kind) {
    case "RESULT":
      return `Hello ${v[0]}, ${v[1]}'s result for "${v[2]}": ${v[3]}. Full report: ${v[4]} - ${institute}`;
    case "TEST_ASSIGNED":
      return `Hello ${v[0]}, a new test "${v[1]}" is available${v[2] ? ` (${v[2]})` : ""}. Start here: ${v[3]} - ${institute}`;
    case "WEEKLY_REPORT":
      return `Hello ${v[0]}, ${v[1]}'s week: ${v[2]}. Details: ${v[3]} - ${institute}`;
    case "PASSWORD_RESET":
      return `${v[0]} is your ${institute} password reset code. It expires in 10 minutes. Don't share it with anyone.`;
    case "TEST_MESSAGE":
      return `Hello ${v[0]}, this is a test message from ${v[1]}. WhatsApp/SMS notifications are working.`;
  }
}

export interface Recipient {
  userId?: string | null;
  name: string;
  phone: string | null;
  notifyWhatsapp?: boolean;
  notifySms?: boolean;
}

export interface OutgoingMessage {
  organizationId: string | null;
  kind: MessageKind;
  variables: string[];
  reportUrl?: string | null;
  /** Ignore the recipient's opt-out (only for security codes the user asked for). */
  essential?: boolean;
}

interface OrgContext {
  config: MessagingConfig;
  institute: string;
}

async function loadOrg(organizationId: string | null): Promise<OrgContext> {
  const org = organizationId
    ? await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true, whatsappConfig: true } })
    : null;
  return { config: parseConfig(org?.whatsappConfig), institute: org?.name ?? "Astra" };
}

async function deliver(ctx: OrgContext, channel: "WHATSAPP" | "SMS", to: string, kind: MessageKind, vars: string[], text: string): Promise<SendResult & { provider: string }> {
  const { config } = ctx;
  if (channel === "WHATSAPP") {
    const wa = config.whatsapp;
    const template = wa.templates[kind];
    if (wa.provider === "OFF") return { ok: false, provider: "NONE", error: "WhatsApp is not configured" };
    // WhatsApp only allows business-initiated messages through pre-approved templates
    if (!template) return { ok: false, provider: wa.provider, error: `No approved WhatsApp template set for ${kind}` };
    if (wa.provider === "META") return { ...(await sendMetaWhatsapp(wa.meta, to, template, vars)), provider: "META" };
    return { ...(await sendTwilio(wa.twilio, to, { contentSid: template, variables: vars }, true)), provider: "TWILIO" };
  }
  const sms = config.sms;
  if (sms.provider === "OFF") return { ok: false, provider: "NONE", error: "SMS is not configured" };
  if (sms.provider === "MSG91") {
    const template = sms.templates[kind];
    if (!template) return { ok: false, provider: "MSG91", error: `No DLT template id set for ${kind}` };
    return { ...(await sendMsg91(sms.msg91, to, template, vars)), provider: "MSG91" };
  }
  return { ...(await sendTwilio(sms.twilio, to, { body: text }, false)), provider: "TWILIO" };
}

async function log(
  msg: OutgoingMessage,
  r: Recipient,
  channel: "WHATSAPP" | "SMS",
  phone: string,
  outcome: { status: "SENT" | "FAILED" | "SKIPPED"; provider?: string; error?: string; id?: string },
  text: string
) {
  return prisma.notificationLog.create({
    data: {
      recipientPhone: phone,
      recipientName: r.name,
      recipientUserId: r.userId ?? null,
      type: msg.kind,
      channel,
      provider: outcome.provider && outcome.provider !== "NONE" ? outcome.provider : null,
      status: outcome.status,
      error: outcome.error ?? null,
      providerMessageId: outcome.id ?? null,
      // Security codes are never stored
      payload: JSON.stringify(msg.kind === "PASSWORD_RESET" ? { messageText: "(password reset code — not stored)" } : { messageText: text, variables: msg.variables }),
      reportUrl: msg.reportUrl ?? null,
      organizationId: msg.organizationId,
    },
  });
}

export interface NotifyOutcome {
  whatsapp: "SENT" | "FAILED" | "SKIPPED";
  sms: "SENT" | "FAILED" | "SKIPPED";
}

/**
 * Send one message to one person on WhatsApp and/or SMS, following the institute's rules:
 * WhatsApp first; SMS always, only when WhatsApp didn't go through, or never.
 */
export async function notify(r: Recipient, msg: OutgoingMessage, ctx?: OrgContext): Promise<NotifyOutcome> {
  const org = ctx ?? (await loadOrg(msg.organizationId));
  const text = renderText(msg.kind, msg.variables, org.institute);
  const phone = toE164(r.phone, org.config.defaultCountryCode);
  const outcome: NotifyOutcome = { whatsapp: "SKIPPED", sms: "SKIPPED" };

  if (!phone) {
    await log(msg, r, "WHATSAPP", r.phone || "—", { status: "SKIPPED", error: r.phone ? "Phone number is not valid" : "No phone number on file" }, text);
    return outcome;
  }

  const waConfigured = org.config.whatsapp.provider !== "OFF";
  const smsConfigured = org.config.sms.provider !== "OFF";
  if (!waConfigured && !smsConfigured) {
    await log(msg, r, "WHATSAPP", phone, { status: "SKIPPED", error: "Messaging is not configured for this institute" }, text);
    return outcome;
  }

  if (waConfigured) {
    if (r.notifyWhatsapp === false && !msg.essential) {
      await log(msg, r, "WHATSAPP", phone, { status: "SKIPPED", error: "Recipient turned off WhatsApp messages" }, text);
    } else {
      const res = await deliver(org, "WHATSAPP", phone, msg.kind, msg.variables, text);
      outcome.whatsapp = res.ok ? "SENT" : "FAILED";
      await log(msg, r, "WHATSAPP", phone, { status: outcome.whatsapp, provider: res.provider, error: res.error, id: res.id }, text);
    }
  }

  const rule = org.config.rules.smsFallback;
  const wantSms = smsConfigured && (rule === "ALWAYS" || (rule === "IF_WHATSAPP_FAILS" && outcome.whatsapp !== "SENT") || (rule === "NEVER" && !waConfigured));
  if (wantSms) {
    if (r.notifySms === false && !msg.essential) {
      await log(msg, r, "SMS", phone, { status: "SKIPPED", error: "Recipient turned off SMS messages" }, text);
    } else {
      const res = await deliver(org, "SMS", phone, msg.kind, msg.variables, text);
      outcome.sms = res.ok ? "SENT" : "FAILED";
      await log(msg, r, "SMS", phone, { status: outcome.sms, provider: res.provider, error: res.error, id: res.id }, text);
    }
  }
  return outcome;
}

/** Send the same kind of message to many people, loading the institute config once. */
export async function notifyMany(items: { recipient: Recipient; message: OutgoingMessage }[]) {
  const cache = new Map<string, OrgContext>();
  const results: NotifyOutcome[] = [];
  for (const { recipient, message } of items) {
    const key = message.organizationId ?? "";
    if (!cache.has(key)) cache.set(key, await loadOrg(message.organizationId));
    results.push(await notify(recipient, message, cache.get(key)));
  }
  return results;
}

/** Re-send a failed or skipped log entry on the same channel, updating it in place. */
// organizationId undefined = any institute (super admin)
export async function retryNotification(logId: string, organizationId?: string | null) {
  const entry = await prisma.notificationLog.findFirst({ where: { id: logId, ...(organizationId === undefined ? {} : { organizationId }) } });
  if (!entry) return { ok: false, error: "Log entry not found" };
  if (entry.status === "SENT") return { ok: false, error: "Already sent" };
  if (entry.type === "PASSWORD_RESET") return { ok: false, error: "Password reset codes can't be re-sent; ask the user to request a new one" };

  const payload = JSON.parse(entry.payload || "{}") as { variables?: string[] };
  if (!Array.isArray(payload.variables)) return { ok: false, error: "This older entry can't be retried" };

  const org = await loadOrg(entry.organizationId);
  const phone = toE164(entry.recipientPhone, org.config.defaultCountryCode);
  if (!phone) return { ok: false, error: "No valid phone number" };
  const kind = entry.type as MessageKind;
  const res = await deliver(org, entry.channel === "SMS" ? "SMS" : "WHATSAPP", phone, kind, payload.variables, renderText(kind, payload.variables, org.institute));
  await prisma.notificationLog.update({
    where: { id: entry.id },
    data: {
      status: res.ok ? "SENT" : "FAILED",
      error: res.error ?? null,
      provider: res.provider !== "NONE" ? res.provider : entry.provider,
      providerMessageId: res.id ?? null,
      attempts: { increment: 1 },
    },
  });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

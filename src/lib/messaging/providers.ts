// HTTP adapters for each provider. Each returns { ok, id?, error? } and never throws.

import type { MessagingConfig } from "./config";

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const TIMEOUT_MS = 15000;

async function call(url: string, init: RequestInit): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    // some providers answer with an empty or non-JSON body
  }
  return { status: res.status, body };
}

const failure = (e: unknown): SendResult => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

/** Meta WhatsApp Cloud API: approved template with positional body parameters. */
export async function sendMetaWhatsapp(cfg: MessagingConfig["whatsapp"]["meta"], to: string, template: string, params: string[]): Promise<SendResult> {
  try {
    const { status, body } = await call(`https://graph.facebook.com/${cfg.apiVersion || "v21.0"}/${encodeURIComponent(cfg.phoneNumberId)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace(/^\+/, ""),
        type: "template",
        template: {
          name: template,
          language: { code: cfg.language || "en" },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
        },
      }),
    });
    const id = (body.messages as { id?: string }[] | undefined)?.[0]?.id;
    if (status >= 200 && status < 300 && id) return { ok: true, id };
    const err = body.error as { message?: string; code?: number } | undefined;
    return { ok: false, error: err?.message ? `${err.message}${err.code ? ` (code ${err.code})` : ""}` : `HTTP ${status}` };
  } catch (e) {
    return failure(e);
  }
}

/** Twilio Messages API, used for both WhatsApp (Content template) and SMS (plain body). */
export async function sendTwilio(
  cfg: { accountSid: string; authToken: string; from: string },
  to: string,
  message: { contentSid: string; variables: string[] } | { body: string },
  whatsapp: boolean,
  statusCallback?: string
): Promise<SendResult> {
  try {
    const form = new URLSearchParams();
    // Twilio posts delivered/failed updates here
    if (statusCallback) form.set("StatusCallback", statusCallback);
    form.set("To", whatsapp ? `whatsapp:${to}` : to);
    // A Messaging Service SID (MG…) goes in MessagingServiceSid; a phone number goes in From
    if (cfg.from.startsWith("MG")) form.set("MessagingServiceSid", cfg.from);
    else form.set("From", whatsapp && !cfg.from.startsWith("whatsapp:") ? `whatsapp:${cfg.from}` : cfg.from);
    if ("contentSid" in message) {
      form.set("ContentSid", message.contentSid);
      form.set("ContentVariables", JSON.stringify(Object.fromEntries(message.variables.map((v, i) => [String(i + 1), v]))));
    } else {
      form.set("Body", message.body);
    }
    const { status, body } = await call(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(cfg.accountSid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (status >= 200 && status < 300 && typeof body.sid === "string") return { ok: true, id: body.sid };
    return { ok: false, error: typeof body.message === "string" ? `${body.message}${body.code ? ` (code ${body.code})` : ""}` : `HTTP ${status}` };
  } catch (e) {
    return failure(e);
  }
}

/** MSG91 Flow API (India): DLT-registered template with VAR1…VARn. */
export async function sendMsg91(cfg: MessagingConfig["sms"]["msg91"], to: string, templateId: string, params: string[]): Promise<SendResult> {
  try {
    const recipient: Record<string, string> = { mobiles: to.replace(/^\+/, "") };
    params.forEach((p, i) => (recipient[`VAR${i + 1}`] = p));
    const { status, body } = await call("https://control.msg91.com/api/v5/flow", {
      method: "POST",
      headers: { authkey: cfg.authKey, accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ template_id: templateId, ...(cfg.sender ? { sender: cfg.sender } : {}), short_url: "0", recipients: [recipient] }),
    });
    if (status >= 200 && status < 300 && body.type === "success") return { ok: true, id: typeof body.message === "string" ? body.message : undefined };
    return { ok: false, error: typeof body.message === "string" ? body.message : `HTTP ${status}` };
  } catch (e) {
    return failure(e);
  }
}

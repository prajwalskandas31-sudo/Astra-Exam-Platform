import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseConfig } from "@/lib/messaging/config";
import { applyDeliveryStatus, webhookUrl } from "@/lib/messaging";

type Provider = "twilio" | "meta" | "msg91";

/** The institute whose secret key is in the URL, or null. */
async function authorise(request: Request, provider: string) {
  if (!["twilio", "meta", "msg91"].includes(provider)) return null;
  const params = new URL(request.url).searchParams;
  const orgId = params.get("org");
  const key = params.get("key") ?? params.get("hub.verify_token");
  if (!orgId || !key) return null;
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, whatsappConfig: true } });
  const config = parseConfig(org?.whatsappConfig);
  const expected = Buffer.from(config.webhookSecret || "");
  const given = Buffer.from(key);
  if (!org || !expected.length || expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  return { orgId: org.id, config };
}

/** Meta's one-time subscription check: echo hub.challenge when the verify token matches. */
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const auth = await authorise(request, provider);
  const q = new URL(request.url).searchParams;
  if (provider !== "meta" || !auth || q.get("hub.mode") !== "subscribe") return new NextResponse("Forbidden", { status: 403 });
  return new NextResponse(q.get("hub.challenge") ?? "", { status: 200 });
}

/** Delivery reports from Twilio, Meta and MSG91. Always answers 200 for known institutes so providers don't retry forever. */
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = (await params) as { provider: Provider };
  const auth = await authorise(request, provider);
  if (!auth) return new NextResponse("Forbidden", { status: 403 });

  try {
    if (provider === "twilio") {
      const raw = await request.text();
      const form = new URLSearchParams(raw);
      // Twilio signs: HMAC-SHA1(auth token, exact callback URL + sorted key/value pairs)
      const tokens = [auth.config.sms.twilio.authToken, auth.config.whatsapp.twilio.authToken].filter(Boolean);
      const url = webhookUrl("twilio", auth.orgId, auth.config.webhookSecret);
      const data = url + [...form.keys()].sort().map((k) => k + form.get(k)).join("");
      const signature = request.headers.get("x-twilio-signature") ?? "";
      const valid = tokens.some((t) => {
        const expected = Buffer.from(crypto.createHmac("sha1", t).update(data).digest("base64"));
        const given = Buffer.from(signature);
        return expected.length === given.length && crypto.timingSafeEqual(expected, given);
      });
      if (!valid) return new NextResponse("Invalid signature", { status: 403 });

      const sid = form.get("MessageSid");
      const status = form.get("MessageStatus");
      const mapped = status === "delivered" ? "DELIVERED" : status === "read" ? "READ" : status === "failed" || status === "undelivered" ? "FAILED" : null;
      if (sid && mapped) await applyDeliveryStatus(auth.orgId, sid, mapped, form.get("ErrorCode") ? `Twilio error ${form.get("ErrorCode")}` : undefined);
    }

    if (provider === "meta") {
      const body = (await request.json()) as {
        entry?: { changes?: { value?: { statuses?: { id: string; status: string; errors?: { code?: number; title?: string; message?: string }[] }[] } }[] }[];
      };
      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          for (const st of change.value?.statuses ?? []) {
            const mapped = st.status === "delivered" ? "DELIVERED" : st.status === "read" ? "READ" : st.status === "failed" ? "FAILED" : null;
            const err = st.errors?.[0];
            if (mapped) await applyDeliveryStatus(auth.orgId, st.id, mapped, err ? `${err.message ?? err.title ?? "Failed"}${err.code ? ` (code ${err.code})` : ""}` : undefined);
          }
        }
      }
    }

    if (provider === "msg91") {
      // MSG91 delivery reports: one or more { requestId, report: [{ status, desc }] }. Parsed defensively.
      const body = await request.json().catch(() => null);
      const items: Record<string, unknown>[] = Array.isArray(body) ? body : body && typeof body === "object" ? [body as Record<string, unknown>] : [];
      for (const item of items) {
        const requestId = String(item.requestId ?? item.request_id ?? item.requestID ?? "");
        const reports = Array.isArray(item.report) ? (item.report as Record<string, unknown>[]) : [item];
        if (!requestId) continue;
        for (const r of reports) {
          const desc = String(r.desc ?? r.description ?? r.status ?? "").toUpperCase();
          const code = String(r.status ?? "");
          const mapped = code === "1" || desc.includes("DELIVERED") ? "DELIVERED" : /FAIL|REJECT|BLOCK|NDNC|INVALID|EXPIRED/.test(desc) || ["2", "9", "16", "17", "25", "26"].includes(code) ? "FAILED" : null;
          if (mapped) await applyDeliveryStatus(auth.orgId, requestId, mapped, mapped === "FAILED" ? `MSG91: ${desc || `status ${code}`}` : undefined);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[MESSAGING_WEBHOOK]", provider, error);
    // Still 200: a malformed report shouldn't make the provider retry indefinitely
    return NextResponse.json({ ok: false });
  }
}

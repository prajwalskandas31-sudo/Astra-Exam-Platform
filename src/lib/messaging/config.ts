// Per-institute messaging configuration: which WhatsApp / SMS provider to use, its credentials,
// approved template ids for each message kind, and the automation rules.
// Stored encrypted in Organization.whatsappConfig; secrets are never returned to the browser.

import crypto from "crypto";

export const MESSAGE_KINDS = ["RESULT", "TEST_ASSIGNED", "WEEKLY_REPORT", "PASSWORD_RESET", "TEST_MESSAGE"] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export type WhatsappProvider = "OFF" | "META" | "TWILIO";
export type SmsProvider = "OFF" | "TWILIO" | "MSG91";
export type SmsFallback = "IF_WHATSAPP_FAILS" | "ALWAYS" | "NEVER";

export interface MessagingConfig {
  defaultCountryCode: string; // e.g. "+91", applied to numbers saved without one
  // Random key in the delivery-report webhook URLs given to providers (not editable)
  webhookSecret: string;
  whatsapp: {
    provider: WhatsappProvider;
    meta: { phoneNumberId: string; accessToken: string; apiVersion: string; language: string };
    twilio: { accountSid: string; authToken: string; from: string };
    // Approved template per kind: Meta template name, or Twilio Content SID (HX…)
    templates: Partial<Record<MessageKind, string>>;
  };
  sms: {
    provider: SmsProvider;
    twilio: { accountSid: string; authToken: string; from: string };
    msg91: { authKey: string; sender: string };
    // MSG91 DLT template id per kind (Twilio SMS sends the plain text)
    templates: Partial<Record<MessageKind, string>>;
  };
  rules: {
    resultToStudent: boolean;
    resultToParents: boolean;
    testAssigned: boolean;
    weeklyDigest: boolean;
    smsFallback: SmsFallback;
  };
}

export const SECRET_FIELDS = ["whatsapp.meta.accessToken", "whatsapp.twilio.authToken", "sms.twilio.authToken", "sms.msg91.authKey"] as const;

export function defaultConfig(): MessagingConfig {
  return {
    defaultCountryCode: "+91",
    webhookSecret: "",
    whatsapp: {
      provider: "OFF",
      meta: { phoneNumberId: "", accessToken: "", apiVersion: "v21.0", language: "en" },
      twilio: { accountSid: "", authToken: "", from: "" },
      templates: {},
    },
    sms: {
      provider: "OFF",
      twilio: { accountSid: "", authToken: "", from: "" },
      msg91: { authKey: "", sender: "" },
      templates: {},
    },
    rules: { resultToStudent: true, resultToParents: true, testAssigned: true, weeklyDigest: true, smsFallback: "IF_WHATSAPP_FAILS" },
  };
}

// ---- encryption at rest (AES-256-GCM, key derived from NEXTAUTH_SECRET) ----

const PREFIX = "enc:v1:";
const key = () => crypto.createHash("sha256").update(`messaging:${process.env.NEXTAUTH_SECRET ?? "dev-secret"}`).digest();

function encrypt(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

function decrypt(stored: string) {
  if (!stored.startsWith(PREFIX)) return stored; // legacy plain JSON
  const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

/** Deep-merge a partial config over defaults, keeping only known keys. */
function merge<T>(base: T, patch: unknown): T {
  if (!patch || typeof patch !== "object" || Array.isArray(patch) || typeof base !== "object" || base === null) {
    return (patch === undefined ? base : (typeof patch === typeof base ? patch : base)) as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if (k === "templates") {
      // Template maps are open-ended, but only for known kinds
      const t: Record<string, string> = {};
      for (const kind of MESSAGE_KINDS) {
        const val = (v as Record<string, unknown>)?.[kind];
        if (typeof val === "string" && val.trim()) t[kind] = val.trim().slice(0, 200);
      }
      out[k] = t;
    } else if (k in out) {
      out[k] = merge(out[k], v);
    }
  }
  return out as T;
}

export function parseConfig(stored: string | null | undefined): MessagingConfig {
  if (!stored) return defaultConfig();
  try {
    return merge(defaultConfig(), JSON.parse(decrypt(stored)));
  } catch {
    return defaultConfig();
  }
}

export const serializeConfig = (cfg: MessagingConfig) => encrypt(JSON.stringify(cfg));

const getPath = (obj: unknown, path: string) => path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);
const setPath = (obj: unknown, path: string, value: unknown) => {
  const keys = path.split(".");
  const last = keys.pop()!;
  const target = keys.reduce<Record<string, unknown>>((o, k) => o[k] as Record<string, unknown>, obj as Record<string, unknown>);
  target[last] = value;
};

/** Copy for the browser: secrets replaced by a hint like "••••a1b2" (or "" when unset). */
export function maskConfig(cfg: MessagingConfig): MessagingConfig {
  const copy = structuredClone(cfg);
  copy.webhookSecret = ""; // exposed only inside the full webhook URLs
  for (const path of SECRET_FIELDS) {
    const v = getPath(copy, path);
    setPath(copy, path, typeof v === "string" && v ? `••••${v.slice(-4)}` : "");
  }
  return copy;
}

/** Apply an update from the settings form. A masked or empty secret means "keep the saved one". */
export function applyUpdate(current: MessagingConfig, patch: unknown): MessagingConfig {
  const next = merge(current, patch);
  next.webhookSecret = current.webhookSecret || crypto.randomBytes(24).toString("base64url");
  for (const path of SECRET_FIELDS) {
    const v = getPath(next, path);
    // Keep the saved secret for blanks and masked hints; real tokens are printable ASCII, so anything
    // else (a mask character, or one mangled into U+FFFD in transit) must never overwrite it
    if (typeof v !== "string" || !v || !/^[!-~]+$/.test(v)) setPath(next, path, getPath(current, path));
  }
  if (!/^\+\d{1,4}$/.test(next.defaultCountryCode)) next.defaultCountryCode = current.defaultCountryCode;
  return next;
}

/**
 * Normalise a stored phone number to E.164 (+919876543210).
 * Handles "98765 43210", "098765-43210", "0091 98765…" and "+44 7700 900123". Returns null if unusable.
 */
export function toE164(raw: string | null | undefined, defaultCountryCode: string): string | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[\s\-().]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (!s.startsWith("+")) s = `${defaultCountryCode}${s.replace(/^0+/, "")}`;
  return /^\+\d{8,15}$/.test(s) ? s : null;
}

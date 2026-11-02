import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyUpdate, defaultConfig, maskConfig, parseConfig, serializeConfig, toE164 } from "../../src/lib/messaging/config";
import { sendMetaWhatsapp, sendMsg91, sendTwilio } from "../../src/lib/messaging/providers";

describe("toE164", () => {
  const cases: [string | null, string, string | null][] = [
    ["98765 43210", "+91", "+919876543210"],
    ["098765-43210", "+91", "+919876543210"],
    ["0091 98765 43210", "+91", "+919876543210"],
    ["+44 7700 900123", "+91", "+447700900123"],
    ["07700 900123", "+44", "+447700900123"],
    ["(987) 654-3210", "+1", "+19876543210"],
    ["12", "+91", null],
    ["not a phone", "+91", null],
    [null, "+91", null],
  ];
  for (const [raw, cc, expected] of cases) {
    it(`${JSON.stringify(raw)} with ${cc} → ${expected}`, () => assert.equal(toE164(raw, cc), expected));
  }
});

describe("messaging config", () => {
  it("round-trips through encryption and never stores secrets in plain text", () => {
    const cfg = defaultConfig();
    cfg.whatsapp.provider = "META";
    cfg.whatsapp.meta.accessToken = "EAAG-super-secret-token";
    const stored = serializeConfig(cfg);
    assert.ok(stored.startsWith("enc:v1:"));
    assert.ok(!stored.includes("super-secret"));
    assert.equal(parseConfig(stored).whatsapp.meta.accessToken, "EAAG-super-secret-token");
  });

  it("falls back to defaults for missing or corrupt config", () => {
    assert.equal(parseConfig(null).whatsapp.provider, "OFF");
    assert.equal(parseConfig("enc:v1:garbage").sms.provider, "OFF");
  });

  it("masks secrets for the browser", () => {
    const cfg = defaultConfig();
    cfg.sms.msg91.authKey = "abcdef123456";
    const masked = maskConfig(cfg);
    assert.equal(masked.sms.msg91.authKey, "••••3456");
    assert.equal(cfg.sms.msg91.authKey, "abcdef123456", "original is untouched");
  });

  it("keeps the saved secret when the form sends it back masked or blank", () => {
    const cfg = defaultConfig();
    cfg.whatsapp.twilio.authToken = "real-token";
    assert.equal(applyUpdate(cfg, { whatsapp: { twilio: { authToken: "••••oken" } } }).whatsapp.twilio.authToken, "real-token");
    assert.equal(applyUpdate(cfg, { whatsapp: { twilio: { authToken: "" } } }).whatsapp.twilio.authToken, "real-token");
    assert.equal(applyUpdate(cfg, { whatsapp: { twilio: { authToken: "new-token" } } }).whatsapp.twilio.authToken, "new-token");
  });

  it("ignores unknown keys, wrong types and template kinds that don't exist", () => {
    const next = applyUpdate(defaultConfig(), {
      evil: true,
      rules: { resultToParents: "yes" },
      whatsapp: { templates: { RESULT: " result_v2 ", BOGUS: "x" } },
      defaultCountryCode: "91",
    });
    assert.equal((next as unknown as Record<string, unknown>).evil, undefined);
    assert.equal(next.rules.resultToParents, true);
    assert.deepEqual(next.whatsapp.templates, { RESULT: "result_v2" });
    assert.equal(next.defaultCountryCode, "+91", "invalid country code keeps the old one");
  });
});

describe("provider adapters", () => {
  const realFetch = globalThis.fetch;
  let captured: { url: string; init: RequestInit } | null = null;
  const mockFetch = (status: number, body: unknown) => {
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      captured = { url, init };
      return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
  };
  afterEach(() => {
    globalThis.fetch = realFetch;
    captured = null;
  });

  it("Meta: sends an approved template with positional body parameters", async () => {
    mockFetch(200, { messages: [{ id: "wamid.123" }] });
    const res = await sendMetaWhatsapp({ phoneNumberId: "1055", accessToken: "tok", apiVersion: "v21.0", language: "en_GB" }, "+919876543210", "result_alert", ["Anil", "Priya"]);
    assert.deepEqual(res, { ok: true, id: "wamid.123" });
    assert.equal(captured!.url, "https://graph.facebook.com/v21.0/1055/messages");
    assert.equal((captured!.init.headers as Record<string, string>).Authorization, "Bearer tok");
    const body = JSON.parse(captured!.init.body as string);
    assert.equal(body.to, "919876543210");
    assert.equal(body.type, "template");
    assert.deepEqual(body.template, {
      name: "result_alert",
      language: { code: "en_GB" },
      components: [{ type: "body", parameters: [{ type: "text", text: "Anil" }, { type: "text", text: "Priya" }] }],
    });
  });

  it("Meta: surfaces the API error message", async () => {
    mockFetch(400, { error: { message: "Template name does not exist", code: 132001 } });
    const res = await sendMetaWhatsapp({ phoneNumberId: "1", accessToken: "t", apiVersion: "v21.0", language: "en" }, "+1", "x", []);
    assert.equal(res.ok, false);
    assert.equal(res.error, "Template name does not exist (code 132001)");
  });

  it("Twilio WhatsApp: Content template with numbered variables", async () => {
    mockFetch(201, { sid: "SM1" });
    const res = await sendTwilio({ accountSid: "AC1", authToken: "secret", from: "+14155238886" }, "+447700900123", { contentSid: "HXabc", variables: ["Anil", "Priya"] }, true);
    assert.deepEqual(res, { ok: true, id: "SM1" });
    assert.equal(captured!.url, "https://api.twilio.com/2010-04-01/Accounts/AC1/Messages.json");
    const form = new URLSearchParams(captured!.init.body as string);
    assert.equal(form.get("To"), "whatsapp:+447700900123");
    assert.equal(form.get("From"), "whatsapp:+14155238886");
    assert.equal(form.get("ContentSid"), "HXabc");
    assert.deepEqual(JSON.parse(form.get("ContentVariables")!), { "1": "Anil", "2": "Priya" });
    assert.equal((captured!.init.headers as Record<string, string>).Authorization, `Basic ${Buffer.from("AC1:secret").toString("base64")}`);
  });

  it("Twilio SMS: plain body, Messaging Service sender", async () => {
    mockFetch(201, { sid: "SM2" });
    await sendTwilio({ accountSid: "AC1", authToken: "s", from: "MG123" }, "+919876543210", { body: "hello" }, false);
    const form = new URLSearchParams(captured!.init.body as string);
    assert.equal(form.get("To"), "+919876543210");
    assert.equal(form.get("MessagingServiceSid"), "MG123");
    assert.equal(form.get("From"), null);
    assert.equal(form.get("Body"), "hello");
  });

  it("MSG91: DLT template with VAR1…VARn", async () => {
    mockFetch(200, { type: "success", message: "3663686f" });
    const res = await sendMsg91({ authKey: "key", sender: "ASTRAA" }, "+919876543210", "6612", ["Anil", "Priya"]);
    assert.equal(res.ok, true);
    assert.equal(captured!.url, "https://control.msg91.com/api/v5/flow");
    assert.equal((captured!.init.headers as Record<string, string>).authkey, "key");
    const body = JSON.parse(captured!.init.body as string);
    assert.equal(body.template_id, "6612");
    assert.equal(body.sender, "ASTRAA");
    assert.deepEqual(body.recipients, [{ mobiles: "919876543210", VAR1: "Anil", VAR2: "Priya" }]);
  });

  it("never throws when the network fails", async () => {
    globalThis.fetch = (async () => { throw new Error("ECONNRESET"); }) as typeof fetch;
    const res = await sendMsg91({ authKey: "k", sender: "" }, "+91", "1", []);
    assert.deepEqual(res, { ok: false, error: "ECONNRESET" });
  });
});

describe("secret hardening", () => {
  it("never saves a masked or mangled secret over the real one", () => {
    const cfg = defaultConfig();
    cfg.whatsapp.meta.accessToken = "EAAreal";
    for (const bad of ["••••1234", "\uFFFD\uFFFD\uFFFD\uFFFD1234", "has space", "tab\there"]) {
      assert.equal(applyUpdate(cfg, { whatsapp: { meta: { accessToken: bad } } }).whatsapp.meta.accessToken, "EAAreal", bad);
    }
  });
});

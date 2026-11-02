"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MessageCircle, Send, Settings2, Smartphone } from "lucide-react";
import { Badge, Btn, Card, CardHeader, ErrorState, Field, PageHeader, PageLoader, inputClass } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import type { MessageKind, MessagingConfig } from "@/lib/messaging/config";

interface Response {
  config: MessagingConfig;
  templateVariables: Record<MessageKind, string[]>;
  last30Days: Record<string, number>;
  coverage: { students: number; studentsNoPhone: number; parentsNoPhone: number; studentsNoParent: number };
  webhooks: { twilio: string; meta: string; msg91: string } | null;
}

const KIND_LABELS: Record<MessageKind, string> = {
  RESULT: "Test result + report link",
  TEST_ASSIGNED: "New test available",
  WEEKLY_REPORT: "Weekly summary",
  PASSWORD_RESET: "Password reset code",
  TEST_MESSAGE: "Test message",
};

const RULES: { key: keyof Omit<MessagingConfig["rules"], "smsFallback">; label: string; hint: string }[] = [
  { key: "resultToParents", label: "Send results to parents", hint: "As soon as a student submits a test" },
  { key: "resultToStudent", label: "Send results to the student", hint: "Same message, addressed to the student" },
  { key: "testAssigned", label: "Announce newly published tests", hint: "To the students in the test's batches" },
  { key: "weeklyDigest", label: "Weekly summary every Monday", hint: "Tests, practice, streak — to parents and students" },
];

export default function MessagingSettingsPage() {
  const { data, error, loading, reload } = useApi<Response>("/api/organization/messaging");
  const [cfg, setCfg] = useState<MessagingConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (data) setCfg(data.config);
  }, [data]);

  if (loading || (!cfg && !error)) return <PageLoader />;
  if (error || !data || !cfg) return <ErrorState message={error || "Failed to load"} onRetry={reload} />;

  // Typed setters for the nested config
  const setWa = (patch: Partial<MessagingConfig["whatsapp"]>) => setCfg({ ...cfg, whatsapp: { ...cfg.whatsapp, ...patch } });
  const setSms = (patch: Partial<MessagingConfig["sms"]>) => setCfg({ ...cfg, sms: { ...cfg.sms, ...patch } });
  const setRules = (patch: Partial<MessagingConfig["rules"]>) => setCfg({ ...cfg, rules: { ...cfg.rules, ...patch } });

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiFetch<{ config: MessagingConfig }>("/api/organization/messaging", { method: "PATCH", json: cfg });
      setCfg(res.config);
      toast.success("Messaging settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const res = await apiFetch<{ details: { channel: string; status: string; error: string | null }[] }>("/api/organization/messaging", { method: "POST", json: { phone: testPhone } });
      for (const d of res.details) {
        if (d.status === "ACCEPTED") toast.success(`${d.channel}: accepted by the provider — check your phone and the logs for delivery`);
        else toast.error(`${d.channel}: ${d.status.toLowerCase()} — ${d.error ?? "unknown error"}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send");
    } finally {
      setTesting(false);
    }
  };

  const waActive = cfg.whatsapp.provider !== "OFF";
  const smsTemplates = cfg.sms.provider === "MSG91";
  const kinds = Object.keys(KIND_LABELS) as MessageKind[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp & SMS"
        description="Send results, report links, new-test alerts and weekly summaries from your institute's own WhatsApp number and SMS sender."
        actions={<Btn loading={saving} onClick={save}>Save settings</Btn>}
      />

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-slate-400">Last 30 days:</span>
        <Badge tone="emerald">{(data.last30Days.DELIVERED ?? 0) + (data.last30Days.READ ?? 0)} delivered</Badge>
        <Badge tone="blue">{data.last30Days.ACCEPTED ?? 0} awaiting confirmation</Badge>
        <Badge tone="rose">{data.last30Days.FAILED ?? 0} failed</Badge>
        <Badge>{(data.last30Days.SKIPPED ?? 0) + (data.last30Days.SENT ?? 0)} skipped</Badge>
        <Link href="/admin/notifications" className="font-semibold text-blue-400 hover:text-blue-300">View logs →</Link>
      </div>

      {(data.coverage.studentsNoPhone > 0 || data.coverage.parentsNoPhone > 0 || data.coverage.studentsNoParent > 0) && (
        <Card className="border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
          <p className="font-semibold">Not everyone can be reached yet</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-amber-200/90">
            {data.coverage.studentsNoPhone > 0 && <li>{data.coverage.studentsNoPhone} of {data.coverage.students} students have no phone number</li>}
            {data.coverage.parentsNoPhone > 0 && <li>{data.coverage.parentsNoPhone} parents have no phone number</li>}
            {data.coverage.studentsNoParent > 0 && <li>{data.coverage.studentsNoParent} students have no parent linked</li>}
          </ul>
          <p className="mt-2 text-xs text-amber-200/80">Fix these in bulk with <Link href="/admin/users" className="font-semibold underline">Users → Import CSV</Link> (existing students are updated, parents are created and linked).</p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="WhatsApp" icon={MessageCircle} description="Business-initiated WhatsApp messages must use templates approved by Meta." />
          <div className="space-y-4 p-5">
            <Field label="Provider">
              <select value={cfg.whatsapp.provider} onChange={(e) => setWa({ provider: e.target.value as MessagingConfig["whatsapp"]["provider"] })} className={inputClass}>
                <option value="OFF">Off</option>
                <option value="META">Meta WhatsApp Cloud API (direct)</option>
                <option value="TWILIO">Twilio</option>
              </select>
            </Field>
            {cfg.whatsapp.provider === "META" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone number ID"><input value={cfg.whatsapp.meta.phoneNumberId} onChange={(e) => setWa({ meta: { ...cfg.whatsapp.meta, phoneNumberId: e.target.value } })} className={inputClass} /></Field>
                <Field label="Access token" hint="Permanent system-user token"><input type="password" autoComplete="off" value={cfg.whatsapp.meta.accessToken} onChange={(e) => setWa({ meta: { ...cfg.whatsapp.meta, accessToken: e.target.value } })} className={inputClass} placeholder="Leave blank to keep" /></Field>
                <Field label="Template language code"><input value={cfg.whatsapp.meta.language} onChange={(e) => setWa({ meta: { ...cfg.whatsapp.meta, language: e.target.value } })} className={inputClass} placeholder="en, en_GB, hi" /></Field>
                <Field label="Graph API version"><input value={cfg.whatsapp.meta.apiVersion} onChange={(e) => setWa({ meta: { ...cfg.whatsapp.meta, apiVersion: e.target.value } })} className={inputClass} /></Field>
              </div>
            )}
            {cfg.whatsapp.provider === "TWILIO" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Account SID"><input value={cfg.whatsapp.twilio.accountSid} onChange={(e) => setWa({ twilio: { ...cfg.whatsapp.twilio, accountSid: e.target.value } })} className={inputClass} /></Field>
                <Field label="Auth token"><input type="password" autoComplete="off" value={cfg.whatsapp.twilio.authToken} onChange={(e) => setWa({ twilio: { ...cfg.whatsapp.twilio, authToken: e.target.value } })} className={inputClass} placeholder="Leave blank to keep" /></Field>
                <div className="sm:col-span-2"><Field label="Sender" hint="WhatsApp-enabled number (+14155238886) or a Messaging Service SID (MG…)"><input value={cfg.whatsapp.twilio.from} onChange={(e) => setWa({ twilio: { ...cfg.whatsapp.twilio, from: e.target.value } })} className={inputClass} /></Field></div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="SMS" icon={Smartphone} description="Fallback for parents without WhatsApp. Indian numbers need DLT-registered templates." />
          <div className="space-y-4 p-5">
            <Field label="Provider">
              <select value={cfg.sms.provider} onChange={(e) => setSms({ provider: e.target.value as MessagingConfig["sms"]["provider"] })} className={inputClass}>
                <option value="OFF">Off</option>
                <option value="MSG91">MSG91 (India, DLT templates)</option>
                <option value="TWILIO">Twilio</option>
              </select>
            </Field>
            {cfg.sms.provider === "MSG91" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Auth key"><input type="password" autoComplete="off" value={cfg.sms.msg91.authKey} onChange={(e) => setSms({ msg91: { ...cfg.sms.msg91, authKey: e.target.value } })} className={inputClass} placeholder="Leave blank to keep" /></Field>
                <Field label="Sender ID (optional)" hint="6-letter DLT header, e.g. ASTRAA"><input value={cfg.sms.msg91.sender} onChange={(e) => setSms({ msg91: { ...cfg.sms.msg91, sender: e.target.value } })} className={inputClass} /></Field>
              </div>
            )}
            {cfg.sms.provider === "TWILIO" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Account SID"><input value={cfg.sms.twilio.accountSid} onChange={(e) => setSms({ twilio: { ...cfg.sms.twilio, accountSid: e.target.value } })} className={inputClass} /></Field>
                <Field label="Auth token"><input type="password" autoComplete="off" value={cfg.sms.twilio.authToken} onChange={(e) => setSms({ twilio: { ...cfg.sms.twilio, authToken: e.target.value } })} className={inputClass} placeholder="Leave blank to keep" /></Field>
                <div className="sm:col-span-2"><Field label="Sender" hint="Twilio number or Messaging Service SID (MG…)"><input value={cfg.sms.twilio.from} onChange={(e) => setSms({ twilio: { ...cfg.sms.twilio, from: e.target.value } })} className={inputClass} /></Field></div>
              </div>
            )}
            <Field label="When to send SMS">
              <select value={cfg.rules.smsFallback} onChange={(e) => setRules({ smsFallback: e.target.value as MessagingConfig["rules"]["smsFallback"] })} className={inputClass}>
                <option value="IF_WHATSAPP_FAILS">Only if WhatsApp didn&apos;t go through (recommended)</option>
                <option value="ALWAYS">Always, as well as WhatsApp</option>
                <option value="NEVER">Never when WhatsApp is on</option>
              </select>
            </Field>
          </div>
        </Card>
      </div>

      {(waActive || smsTemplates) && (
        <Card>
          <CardHeader title="Approved templates" icon={Settings2} description="Create each template in your provider's console with the variables in exactly this order, then paste its name or ID here." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-white/[0.06] bg-black/20 text-xs text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Message</th>
                  <th className="px-3 py-3 font-medium">Variables, in order</th>
                  {waActive && <th className="px-3 py-3 font-medium">{cfg.whatsapp.provider === "META" ? "WhatsApp template name" : "Twilio Content SID (HX…)"}</th>}
                  {smsTemplates && <th className="px-5 py-3 font-medium">MSG91 DLT template ID</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {kinds.map((k) => (
                  <tr key={k}>
                    <td className="px-5 py-3 text-slate-200">{KIND_LABELS[k]}</td>
                    <td className="px-3 py-3 text-xs text-slate-400">{data.templateVariables[k].map((v, i) => `{{${i + 1}}} ${v}`).join(" · ")}</td>
                    {waActive && (
                      <td className="px-3 py-3">
                        <input value={cfg.whatsapp.templates[k] ?? ""} onChange={(e) => setWa({ templates: { ...cfg.whatsapp.templates, [k]: e.target.value } })} className={`${inputClass} py-1.5 text-xs`} aria-label={`WhatsApp template for ${KIND_LABELS[k]}`} />
                      </td>
                    )}
                    {smsTemplates && (
                      <td className="px-5 py-3">
                        <input value={cfg.sms.templates[k] ?? ""} onChange={(e) => setSms({ templates: { ...cfg.sms.templates, [k]: e.target.value } })} className={`${inputClass} py-1.5 text-xs`} aria-label={`MSG91 template for ${KIND_LABELS[k]}`} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(waActive || cfg.sms.provider !== "OFF") && (
        <Card>
          <CardHeader title="Delivery reports" description="Providers confirm when a message is actually delivered. Until then it shows as “awaiting delivery report”." />
          <div className="space-y-3 p-5 text-xs">
            {!data.webhooks ? (
              <p className="text-slate-400">Save your settings to generate this institute&apos;s delivery-report URLs.</p>
            ) : (
              <>
                {(cfg.whatsapp.provider === "TWILIO" || cfg.sms.provider === "TWILIO") && <p className="text-slate-400">Twilio: nothing to set up — the callback URL is sent with every message and its signature is verified.</p>}
                {cfg.whatsapp.provider === "META" && <WebhookRow label="Meta: WhatsApp Manager → Configuration → Webhook (subscribe to “messages”). Use the URL; the verify token is the key= value in it." url={data.webhooks.meta} />}
                {cfg.sms.provider === "MSG91" && <WebhookRow label="MSG91: Panel → Webhooks → Delivery report (JSON)." url={data.webhooks.msg91} />}
              </>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Automations" />
          <div className="divide-y divide-white/[0.05]">
            {RULES.map((r) => (
              <label key={r.key} className="flex cursor-pointer items-start justify-between gap-4 px-5 py-3">
                <span>
                  <span className="block text-sm text-slate-200">{r.label}</span>
                  <span className="block text-xs text-slate-500">{r.hint}</span>
                </span>
                <input type="checkbox" role="switch" checked={cfg.rules[r.key]} onChange={(e) => setRules({ [r.key]: e.target.checked })} className="mt-1 h-4 w-4 accent-blue-500" />
              </label>
            ))}
            <div className="px-5 py-3">
              <Field label="Default country code" hint="Added to phone numbers saved without one">
                <input value={cfg.defaultCountryCode} onChange={(e) => setCfg({ ...cfg, defaultCountryCode: e.target.value })} className={`${inputClass} w-32`} placeholder="+91" />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Send a test message" icon={Send} description="Save first, then check delivery to your own phone." />
          <div className="space-y-4 p-5">
            <Field label="Phone number"><input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+91 98765 43210" className={inputClass} /></Field>
            <Btn variant="secondary" loading={testing} disabled={!testPhone.trim()} onClick={sendTest}><Send className="h-4 w-4" />Send test</Btn>
            <p className="text-xs text-slate-500">Recipients can turn WhatsApp or SMS off under their own Settings. Messages to people without a phone number are logged as skipped so you can follow up.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function WebhookRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="space-y-1">
      <p className="text-slate-400">{label}</p>
      <div className="flex items-center gap-2 rounded-lg bg-black/30 p-2">
        <code className="flex-1 truncate font-mono text-slate-300">{url}</code>
        <Btn size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Copied"))}>Copy</Btn>
      </div>
    </div>
  );
}

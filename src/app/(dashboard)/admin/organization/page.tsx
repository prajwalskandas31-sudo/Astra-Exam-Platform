"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Palette } from "lucide-react";
import { Badge, Btn, Card, CardHeader, ErrorState, Field, PageHeader, PageLoader, inputClass } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";

interface Org {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  academicYear: string | null;
  customDomain: string | null;
  offeredCategories: string[];
  whatsappProvider: string | null;
}

const CATEGORIES = ["PLAB", "NEET", "JEE", "GATE", "AFCAT", "COMEDK", "SSC CGL", "CUSTOM"];

export default function OrganizationPage() {
  const { data, error, loading, reload } = useApi<Org>("/api/organization");
  const [form, setForm] = useState<Org | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const { id: _id, slug: _slug, whatsappProvider: _w, ...payload } = form;
      await apiFetch("/api/organization", {
        method: "PATCH",
        json: Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, v ?? ""])),
      });
      toast.success("Organization settings saved");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  if (loading || (!form && !error)) return <PageLoader />;
  if (error || !form) return <ErrorState message={error || "Failed to load"} onRetry={reload} />;

  const set = (k: keyof Org, v: string | string[]) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-6">
      <PageHeader title="Organization" description="Institute profile, branding and the exams you offer." actions={<Btn loading={saving} onClick={save}>Save changes</Btn>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Institute profile" icon={Building2} />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Institute name"><input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} /></Field></div>
            <Field label="Contact email"><input type="email" value={form.contactEmail ?? ""} onChange={(e) => set("contactEmail", e.target.value)} className={inputClass} /></Field>
            <Field label="Contact phone"><input value={form.contactPhone ?? ""} onChange={(e) => set("contactPhone", e.target.value)} className={inputClass} /></Field>
            <Field label="Academic year"><input value={form.academicYear ?? ""} onChange={(e) => set("academicYear", e.target.value)} className={inputClass} placeholder="2026-2027" /></Field>
            <Field label="Custom domain" hint="Point a CNAME at this deployment, then enter it here."><input value={form.customDomain ?? ""} onChange={(e) => set("customDomain", e.target.value)} className={inputClass} placeholder="exams.yourinstitute.com" /></Field>
            <div className="sm:col-span-2"><Field label="Logo URL"><input value={form.logoUrl ?? ""} onChange={(e) => set("logoUrl", e.target.value)} className={inputClass} placeholder="https://…/logo.png" /></Field></div>
            <div className="sm:col-span-2 space-y-2">
              <p className="text-xs font-medium text-slate-300">Exams offered</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const on = form.offeredCategories.includes(c);
                  return (
                    <button
                      key={c}
                      aria-pressed={on}
                      onClick={() => set("offeredCategories", on ? form.offeredCategories.filter((x) => x !== c) : [...form.offeredCategories, c])}
                      className={on ? "rounded-lg border border-blue-500 bg-blue-600/20 px-3 py-1.5 text-xs font-semibold text-blue-200" : "rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white"}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Branding" icon={Palette} />
            <div className="space-y-4 p-5">
              {(["primaryColor", "secondaryColor"] as const).map((k) => (
                <Field key={k} label={k === "primaryColor" ? "Primary colour" : "Secondary colour"}>
                  <div className="flex gap-2">
                    <input type="color" value={form[k] ?? "#2563eb"} onChange={(e) => set(k, e.target.value)} className="h-10 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent" aria-label={k} />
                    <input value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} className={inputClass} />
                  </div>
                </Field>
              ))}
              <div className="rounded-xl border border-white/10 p-4">
                <p className="mb-2 text-[11px] text-slate-500">Preview</p>
                <div className="flex items-center gap-3">
                  {form.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg font-bold text-white" style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})` }}>{form.name.charAt(0)}</div>
                  )}
                  <span className="font-semibold text-white">{form.name}</span>
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-semibold text-white">WhatsApp notifications</p>
            <p className="mt-1 text-xs text-slate-400">Provider: {form.whatsappProvider ? <Badge>{form.whatsappProvider}</Badge> : "not configured"}</p>
            <p className="mt-2 text-xs text-slate-500">Messages are currently simulated and recorded in Notification Logs until a provider is connected.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

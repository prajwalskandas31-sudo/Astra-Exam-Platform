"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Archive, BarChart3, ClipboardList, Eye, EyeOff, MonitorCheck, Plus, Search, Shuffle, Trash2 } from "lucide-react";
import { Badge, Btn, Card, EmptyState, ErrorState, Field, Modal, PageLoader, Tabs, formatDate, inputClass } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

interface Test {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  totalMarks: number;
  type: "MOCK" | "PRACTICE";
  mode: "CBT" | "OMR";
  status: string;
  isPublished: boolean;
  scheduledStart: string | null;
  shuffleMode: "OFF" | "PER_STUDENT" | "SETS";
  shuffleOptions: boolean;
  setCount: number;
  centreExam: boolean;
  allowOffline: boolean;
  createdAt: string;
  template: { name: string; examCategory: string } | null;
  batches: { id: string; name: string }[];
  _count: { questions: number; attempts: number };
}

interface Question {
  id: string;
  text: string;
  subject: string;
  topic: string;
  difficulty: string;
  marks: number;
  status: string;
}

interface Template {
  id: string;
  name: string;
  examCategory: string;
  mode: "CBT" | "OMR";
  totalDuration: number;
}

interface PaperSecurity {
  shuffleMode: "OFF" | "PER_STUDENT" | "SETS";
  shuffleOptions: boolean;
  setCount: number;
  centreExam: boolean;
  allowOffline: boolean;
}

const defaultSecurity = (): PaperSecurity => ({ shuffleMode: "PER_STUDENT", shuffleOptions: true, setCount: 4, centreExam: false, allowOffline: false });

const emptyForm = () => ({
  title: "", description: "", duration: 60, type: "PRACTICE", mode: "CBT", templateId: "",
  isPublished: true, scheduledStart: "", scheduledEnd: "",
  ...defaultSecurity(),
});

type ExamModes = { examCentreEnabled: boolean; offlineExamsEnabled: boolean };

/** Shuffling, named sets, and (when the institute has them on) Exam Centre and offline settings. */
function PaperSecurityFields({ value, onChange, modes }: { value: PaperSecurity; onChange: (v: PaperSecurity) => void; modes: ExamModes | null }) {
  const set = (patch: Partial<PaperSecurity>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-white"><Shuffle className="h-4 w-4 text-violet-300" />Paper security</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Question order">
          <select value={value.shuffleMode} onChange={(e) => set({ shuffleMode: e.target.value as PaperSecurity["shuffleMode"] })} className={inputClass} aria-label="Question order">
            <option value="PER_STUDENT">Different order for every student (recommended)</option>
            <option value="SETS">Named sets (A, B, C…)</option>
            <option value="OFF">Same order for everyone</option>
          </select>
        </Field>
        {value.shuffleMode === "SETS" && (
          <Field label="Number of sets">
            <select value={value.setCount} onChange={(e) => set({ setCount: Number(e.target.value) })} className={inputClass} aria-label="Number of sets">
              {[2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} sets ({"ABCDEFGH".slice(0, n).split("").join(", ")})</option>)}
            </select>
          </Field>
        )}
      </div>
      {value.shuffleMode !== "OFF" && (
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={value.shuffleOptions} onChange={(e) => set({ shuffleOptions: e.target.checked })} className="h-4 w-4 accent-blue-500" />
          <span>Shuffle the options too <span className="text-xs text-slate-500">(“All of the above”-style and numerical questions stay as they are)</span></span>
        </label>
      )}
      <p className="text-xs text-slate-500">Sections stay together. Everyone gets the same questions and is graded the same way — only the order differs, so neighbours can&apos;t copy.</p>
      {modes?.examCentreEnabled && (
        <div className="space-y-2 border-t border-white/[0.06] pt-3">
          <label className="flex items-start gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={value.centreExam} onChange={(e) => set({ centreExam: e.target.checked, allowOffline: e.target.checked && value.allowOffline })} className="mt-0.5 h-4 w-4 accent-blue-500" />
            <span>Run in Exam Centre mode <span className="block text-xs text-slate-500">Invigilator start code, seat plan (neighbours get different sets) and a live room view.</span></span>
          </label>
          {modes.offlineExamsEnabled && (
            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={value.allowOffline} onChange={(e) => set({ allowOffline: e.target.checked, centreExam: e.target.checked || value.centreExam })} className="mt-0.5 h-4 w-4 accent-blue-500" />
              <span>Allow offline <span className="block text-xs text-slate-500">Devices download the encrypted paper beforehand and can sit the exam without internet; answers upload afterwards.</span></span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

export function TestManager() {
  // Shared by /mentor/test-manager and /admin/test-manager; analysis pages live under the same base
  const base = usePathname().replace(/\/$/, "");
  const tests = useApi<Test[]>("/api/tests");
  const questions = useApi<Question[]>("/api/questions?status=PUBLISHED");
  const templates = useApi<Template[]>("/api/templates");
  const batches = useApi<{ id: string; name: string }[]>("/api/batches");
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [audienceFor, setAudienceFor] = useState<Test | null>(null);
  const [audienceIds, setAudienceIds] = useState<string[]>([]);
  const modes = useApi<ExamModes>("/api/organization/exam-modes");
  const [securityFor, setSecurityFor] = useState<Test | null>(null);
  const [security, setSecurity] = useState<PaperSecurity>(defaultSecurity());

  const saveSecurity = async () => {
    if (!securityFor) return;
    try {
      await apiFetch(`/api/tests/${securityFor.id}`, { method: "PATCH", json: security });
      toast.success("Paper security updated");
      setSecurityFor(null);
      tests.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update the test");
    }
  };

  const saveAudience = async () => {
    if (!audienceFor) return;
    try {
      await apiFetch(`/api/tests/${audienceFor.id}`, { method: "PATCH", json: { batchIds: audienceIds } });
      toast.success(audienceIds.length ? "Test limited to the selected batches" : "Test opened to every student");
      setAudienceFor(null);
      tests.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update audience");
    }
  };
  const [view, setView] = useState<"all" | "live" | "draft" | "archived">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [selected, setSelected] = useState<string[]>([]);
  const [qQuery, setQQuery] = useState("");
  const [qSubject, setQSubject] = useState("ALL");
  const [saving, setSaving] = useState(false);

  const allQuestions = useMemo(() => questions.data ?? [], [questions.data]);
  const subjects = useMemo(() => Array.from(new Set(allQuestions.map((q) => q.subject))).sort(), [allQuestions]);
  const pickable = allQuestions.filter((q) =>
    (qSubject === "ALL" || q.subject === qSubject) &&
    (!qQuery || `${q.text} ${q.topic}`.toLowerCase().includes(qQuery.toLowerCase()))
  );
  const selectedMarks = allQuestions.filter((q) => selected.includes(q.id)).reduce((s, q) => s + q.marks, 0);

  const list = (tests.data ?? []).filter((t) =>
    view === "all" ? t.status !== "ARCHIVED" : view === "live" ? t.isPublished : view === "draft" ? !t.isPublished && t.status !== "ARCHIVED" : t.status === "ARCHIVED"
  );

  const applyTemplate = (id: string) => {
    const tpl = templates.data?.find((t) => t.id === id);
    setForm((f) => ({ ...f, templateId: id, ...(tpl ? { mode: tpl.mode, duration: tpl.totalDuration } : {}) }));
  };

  const create = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/tests", {
        method: "POST",
        json: {
          ...form,
          templateId: form.templateId || null,
          scheduledStart: form.scheduledStart || null,
          scheduledEnd: form.scheduledEnd || null,
          questionIds: selected,
          batchIds,
        },
      });
      toast.success(form.isPublished ? "Test published to students" : "Test saved as draft");
      setOpen(false);
      setForm(emptyForm());
      setSelected([]);
      setBatchIds([]);
      tests.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create test");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (t: Test) => {
    try {
      await apiFetch(`/api/tests/${t.id}`, { method: "PATCH", json: { isPublished: !t.isPublished } });
      toast.success(t.isPublished ? "Test hidden from students" : "Test published");
      tests.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update test");
    }
  };

  const remove = async (t: Test) => {
    const msg = t._count.attempts > 0
      ? `"${t.title}" has ${t._count.attempts} attempts. It will be archived (hidden) and results kept. Continue?`
      : `Delete "${t.title}" permanently?`;
    if (!window.confirm(msg)) return;
    try {
      const res = await apiFetch<{ archived: boolean }>(`/api/tests/${t.id}`, { method: "DELETE" });
      toast.success(res.archived ? "Test archived" : "Test deleted");
      tests.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete test");
    }
  };

  if (tests.loading) return <PageLoader label="Loading tests…" />;
  if (tests.error) return <ErrorState message={tests.error} onRetry={tests.reload} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={view} onChange={setView} items={[
          { id: "all", label: "All" },
          { id: "live", label: "Published", count: (tests.data ?? []).filter((t) => t.isPublished).length },
          { id: "draft", label: "Drafts" },
          { id: "archived", label: "Archived" },
        ]} />
        <Btn onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Create test</Btn>
      </div>

      {list.length === 0 ? (
        <Card><EmptyState icon={ClipboardList} title="No tests here" description="Create a test from questions in your bank and publish it to students." action={<Btn onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Create test</Btn>} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-white/[0.06] bg-black/20 text-xs text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Test</th>
                  <th className="px-3 py-3 font-medium">Format</th>
                  <th className="px-3 py-3 font-medium">Questions</th>
                  <th className="px-3 py-3 font-medium">Attempts</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {list.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <Link href={`${base}/${t.id}`} className="font-medium text-slate-100 hover:text-blue-300">{t.title}</Link>
                      <p className="text-xs text-slate-500">
                        {t.template?.name ?? "Custom"} · created {formatDate(t.createdAt)} ·{" "}
                        <button
                          onClick={() => { setAudienceFor(t); setAudienceIds(t.batches.map((b) => b.id)); }}
                          className="underline decoration-dotted underline-offset-2 hover:text-blue-300"
                          title="Change which batches can see this test"
                        >
                          {t.batches?.length ? t.batches.map((b) => b.name).join(", ") : "all students"}
                        </button>
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={t.type === "MOCK" ? "violet" : "blue"}>{t.type.toLowerCase()}</Badge><Badge>{t.mode}</Badge>
                        <button
                          onClick={() => { setSecurityFor(t); setSecurity({ shuffleMode: t.shuffleMode, shuffleOptions: t.shuffleOptions, setCount: t.setCount, centreExam: t.centreExam, allowOffline: t.allowOffline }); }}
                          title="Paper security: change shuffling, sets or Exam Centre settings"
                          aria-label={`Paper security for ${t.title}`}
                        >
                          <Badge tone={t.shuffleMode === "OFF" ? "slate" : "emerald"}>{t.shuffleMode === "SETS" ? `${t.setCount} sets` : t.shuffleMode === "PER_STUDENT" ? "shuffled" : "fixed order"}</Badge>
                        </button>
                        {t.centreExam && <Badge tone="amber">centre{t.allowOffline ? " · offline" : ""}</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{t.duration} min · {t.totalMarks} marks</p>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-slate-300">{t._count.questions}</td>
                    <td className="px-3 py-3 tabular-nums text-slate-300">{t._count.attempts}</td>
                    <td className="px-3 py-3">
                      {t.status === "ARCHIVED" ? <Badge>Archived</Badge> : t.isPublished ? <Badge tone="emerald">Published</Badge> : <Badge tone="amber">Draft</Badge>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        {t.centreExam && (
                          <Link href={`${base}/${t.id}/centre`} className="inline-flex h-8 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-amber-300 hover:bg-amber-500/10">
                            <MonitorCheck className="h-3.5 w-3.5" />Centre
                          </Link>
                        )}
                        <Link href={`${base}/${t.id}`} className="inline-flex h-8 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white">
                          <BarChart3 className="h-3.5 w-3.5" />Results
                        </Link>
                        {t.status !== "ARCHIVED" && (
                          <Btn size="sm" variant="ghost" onClick={() => togglePublish(t)}>
                            {t.isPublished ? <><EyeOff className="h-3.5 w-3.5" />Unpublish</> : <><Eye className="h-3.5 w-3.5" />Publish</>}
                          </Btn>
                        )}
                        {t.status !== "ARCHIVED" && (
                          <button onClick={() => remove(t)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" aria-label="Delete or archive test">
                            {t._count.attempts > 0 ? <Archive className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={!!audienceFor}
        onClose={() => setAudienceFor(null)}
        title="Who can take this test?"
        description={audienceFor ? `${audienceFor.title} — choose batches, or none for every student in the institute.` : undefined}
        size="sm"
        footer={<><Btn variant="secondary" onClick={() => setAudienceFor(null)}>Cancel</Btn><Btn onClick={saveAudience}>Save</Btn></>}
      >
        <div className="flex flex-wrap gap-1.5">
          {(batches.data ?? []).length === 0 && <p className="text-sm text-slate-500">No batches yet — create them under Admin → Batches.</p>}
          {(batches.data ?? []).map((b) => {
            const on = audienceIds.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                aria-pressed={on}
                onClick={() => setAudienceIds(on ? audienceIds.filter((x) => x !== b.id) : [...audienceIds, b.id])}
                className={cn("rounded-lg border px-2.5 py-1 text-xs font-medium transition", on ? "border-blue-500/60 bg-blue-500/15 text-blue-200" : "border-white/10 text-slate-400 hover:text-white")}
              >
                {b.name}
              </button>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={!!securityFor}
        onClose={() => setSecurityFor(null)}
        title="Paper security"
        description={securityFor ? `${securityFor.title} — students who already started keep the paper they were given.` : undefined}
        footer={<><Btn variant="secondary" onClick={() => setSecurityFor(null)}>Cancel</Btn><Btn onClick={saveSecurity}>Save</Btn></>}
      >
        <PaperSecurityFields value={security} onChange={setSecurity} modes={modes.data ?? null} />
      </Modal>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create test"
        description="Pick questions from your published bank. Total marks are calculated automatically."
        size="lg"
        footer={
          <>
            <span className="mr-auto self-center text-xs text-slate-400">{selected.length} questions · {selectedMarks} marks</span>
            <Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn loading={saving} disabled={!form.title.trim() || selected.length === 0} onClick={create}>{form.isPublished ? "Create & publish" : "Save draft"}</Btn>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="e.g. PLAB 1 Mock #3" /></Field></div>
            <div className="sm:col-span-2"><Field label="Description (optional)"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} /></Field></div>
            <Field label="Exam template">
              <select value={form.templateId} onChange={(e) => applyTemplate(e.target.value)} className={inputClass}>
                <option value="">Custom (no template)</option>
                {(templates.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Duration (minutes)"><input type="number" min={1} max={600} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} className={inputClass} /></Field>
            <Field label="Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                <option value="PRACTICE">Practice</option><option value="MOCK">Mock (proctored)</option>
              </select>
            </Field>
            <Field label="Interface">
              <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className={inputClass}>
                <option value="CBT">CBT (computer-based)</option><option value="OMR">OMR bubble sheet</option>
              </select>
            </Field>
            <Field label="Opens at (optional)"><input type="datetime-local" value={form.scheduledStart} onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })} className={inputClass} /></Field>
            <Field label="Closes at (optional)"><input type="datetime-local" value={form.scheduledEnd} onChange={(e) => setForm({ ...form, scheduledEnd: e.target.value })} className={inputClass} /></Field>
          </div>
          {(batches.data ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-300">Assign to batches <span className="text-slate-500">(none selected = every student in the institute)</span></p>
              <div className="flex flex-wrap gap-1.5">
                {(batches.data ?? []).map((b) => {
                  const on = batchIds.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setBatchIds(on ? batchIds.filter((x) => x !== b.id) : [...batchIds, b.id])}
                      className={cn("rounded-lg border px-2.5 py-1 text-xs font-medium transition", on ? "border-blue-500/60 bg-blue-500/15 text-blue-200" : "border-white/10 text-slate-400 hover:text-white")}
                    >
                      {b.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <PaperSecurityFields
            value={{ shuffleMode: form.shuffleMode, shuffleOptions: form.shuffleOptions, setCount: form.setCount, centreExam: form.centreExam, allowOffline: form.allowOffline }}
            onChange={(v) => setForm({ ...form, ...v })}
            modes={modes.data ?? null}
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="h-4 w-4 accent-blue-500" />
            Publish to students immediately (they&apos;re notified by WhatsApp/SMS if messaging is set up)
          </label>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">Questions</p>
              <div className="flex gap-2">
                {subjects.length > 1 && (
                  <select value={qSubject} onChange={(e) => setQSubject(e.target.value)} className={`${inputClass} w-auto py-1.5`} aria-label="Filter by subject">
                    <option value="ALL">All subjects</option>
                    {subjects.map((s) => <option key={s}>{s}</option>)}
                  </select>
                )}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input value={qQuery} onChange={(e) => setQQuery(e.target.value)} placeholder="Search" className={`${inputClass} py-1.5 pl-8`} />
                </div>
                <Btn size="sm" variant="secondary" onClick={() => setSelected(Array.from(new Set([...selected, ...pickable.map((q) => q.id)])))}>Select all</Btn>
                {selected.length > 0 && <Btn size="sm" variant="ghost" onClick={() => setSelected([])}>Clear</Btn>}
              </div>
            </div>
            {questions.loading ? <PageLoader /> : pickable.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">No published questions. Add or publish questions in the question bank first.</p>
            ) : (
              <div className="max-h-72 divide-y divide-white/[0.05] overflow-y-auto rounded-xl border border-white/[0.08]">
                {pickable.map((q) => {
                  const on = selected.includes(q.id);
                  return (
                    <label key={q.id} className={cn("flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-white/[0.02]", on && "bg-blue-600/10")}>
                      <input type="checkbox" checked={on} onChange={() => setSelected(on ? selected.filter((x) => x !== q.id) : [...selected, q.id])} className="mt-0.5 h-4 w-4 accent-blue-500" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm text-slate-200">{q.text}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{q.subject} · {q.topic} · {q.difficulty.toLowerCase()} · {q.marks} marks</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

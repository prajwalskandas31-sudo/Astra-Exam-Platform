"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BookOpen, FileJson, FileUp, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge, Btn, Card, EmptyState, ErrorState, Field, Modal, PageLoader, Tabs, inputClass } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";

interface Question {
  id: string;
  text: string;
  options: string;
  correctOption: string;
  explanation: string | null;
  subject: string;
  chapter: string | null;
  topic: string;
  difficulty: string;
  questionType: string;
  marks: number;
  negativeMarks: number;
  examCategory: string | null;
  tags: string;
  status: string;
  sourceFile: string | null;
  organizationId: string | null;
  _count: { tests: number; answers: number };
}

interface Draft {
  id?: string;
  text: string;
  questionType: string;
  options: { id: string; text: string }[];
  correctOption: string;
  explanation: string;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: string;
  marks: number;
  negativeMarks: number;
  examCategory: string;
  tags: string;
  status: string;
}

const TYPES = [
  { id: "SINGLE_CHOICE", label: "Single choice" },
  { id: "MULTIPLE_CHOICE", label: "Multiple choice" },
  { id: "NUMERICAL", label: "Numerical" },
  { id: "ASSERTION_REASON", label: "Assertion–reason" },
  { id: "MATCH_THE_FOLLOWING", label: "Match the following" },
  { id: "PASSAGE", label: "Passage based" },
];

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const emptyDraft = (): Draft => ({
  text: "", questionType: "SINGLE_CHOICE",
  options: LETTERS.slice(0, 4).map((id) => ({ id, text: "" })),
  correctOption: "A", explanation: "", subject: "", chapter: "", topic: "", difficulty: "MEDIUM",
  marks: 4, negativeMarks: 1, examCategory: "", tags: "", status: "PUBLISHED",
});

function parseOptions(raw: string): { id: string; text: string }[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const JSON_SAMPLE = `[
  {
    "text": "What is 2 + 2?",
    "options": [{ "id": "A", "text": "3" }, { "id": "B", "text": "4" }],
    "correctOption": "B",
    "subject": "Mathematics", "topic": "Arithmetic",
    "difficulty": "EASY", "marks": 4, "negativeMarks": 1,
    "explanation": "2 + 2 = 4"
  }
]`;

export function QuestionBank() {
  const { data, error, loading, reload } = useApi<Question[]>("/api/questions");
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("ALL");
  const [status, setStatus] = useState<"all" | "PUBLISHED" | "DRAFT">("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pdf, setPdf] = useState<{ q: File | null; a: File | null; name: string; subject: string }>({ q: null, a: null, name: "", subject: "" });
  const [uploading, setUploading] = useState(false);
  const jsonInput = useRef<HTMLInputElement>(null);

  const questions = useMemo(() => data ?? [], [data]);
  const subjects = useMemo(() => Array.from(new Set(questions.map((q) => q.subject))).sort(), [questions]);
  const visible = questions.filter((q) =>
    (subject === "ALL" || q.subject === subject) &&
    (status === "all" || q.status === status) &&
    (!query || `${q.text} ${q.topic} ${q.chapter ?? ""} ${q.tags}`.toLowerCase().includes(query.toLowerCase()))
  );

  const openEdit = (q: Question) =>
    setDraft({
      id: q.id, text: q.text, questionType: q.questionType,
      options: q.questionType === "NUMERICAL" ? LETTERS.slice(0, 4).map((id) => ({ id, text: "" })) : parseOptions(q.options),
      correctOption: q.correctOption, explanation: q.explanation ?? "", subject: q.subject, chapter: q.chapter ?? "",
      topic: q.topic, difficulty: q.difficulty, marks: q.marks, negativeMarks: q.negativeMarks,
      examCategory: q.examCategory ?? "", tags: q.tags, status: q.status,
    });

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const payload = { ...draft, options: draft.questionType === "NUMERICAL" ? [] : draft.options.filter((o) => o.text.trim()) };
      if (draft.id) await apiFetch(`/api/questions/${draft.id}`, { method: "PATCH", json: payload });
      else await apiFetch("/api/questions", { method: "POST", json: payload });
      toast.success(draft.id ? "Question updated" : "Question added");
      setDraft(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save question");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (q: Question) => {
    if (!window.confirm("Delete this question? If students have answered it, it will be moved to drafts instead.")) return;
    try {
      const res = await apiFetch<{ archived: boolean }>(`/api/questions/${q.id}`, { method: "DELETE" });
      toast.success(res.archived ? "Question has answers, so it was moved to drafts" : "Question deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete");
    }
  };

  const toggleStatus = async (q: Question) => {
    try {
      await apiFetch(`/api/questions/${q.id}`, { method: "PATCH", json: { status: q.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" } });
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update");
    }
  };

  const uploadJson = async (file: File) => {
    setUploading(true);
    try {
      const parsed = JSON.parse(await file.text());
      const res = await apiFetch<{ count: number; skipped: number; details: string[] }>("/api/questions/bulk", { method: "POST", json: { questions: parsed, sourceFile: file.name } });
      toast.success(`Imported ${res.count} questions${res.skipped ? `, skipped ${res.skipped} invalid rows` : ""}`);
      if (res.skipped) console.warn("Skipped rows:", res.details);
      setImportOpen(false);
      reload();
    } catch (e) {
      toast.error(e instanceof SyntaxError ? "That file isn't valid JSON" : e instanceof Error ? e.message : "Import failed");
    } finally {
      setUploading(false);
      if (jsonInput.current) jsonInput.current.value = "";
    }
  };

  const uploadPdf = async () => {
    if (!pdf.q) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", pdf.q);
      if (pdf.a) fd.append("answerFile", pdf.a);
      if (pdf.name) fd.append("questionSetName", pdf.name);
      if (pdf.subject) fd.append("subject", pdf.subject);
      const res = await apiFetch<{ message: string }>("/api/questions/upload-pdf", { method: "POST", body: fd });
      toast.success(res.message);
      setImportOpen(false);
      setPdf({ q: null, a: null, name: "", subject: "" });
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF import failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <PageLoader label="Loading question bank…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const isMulti = draft?.questionType === "MULTIPLE_CHOICE";
  const correctSet = new Set((draft?.correctOption || "").split(",").filter(Boolean));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={status} onChange={setStatus} items={[
            { id: "all", label: "All", count: questions.length },
            { id: "PUBLISHED", label: "Published", count: questions.filter((q) => q.status === "PUBLISHED").length },
            { id: "DRAFT", label: "Drafts", count: questions.filter((q) => q.status === "DRAFT").length },
          ]} />
          {subjects.length > 1 && (
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className={`${inputClass} w-auto`} aria-label="Subject">
              <option value="ALL">All subjects</option>
              {subjects.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions" className={`${inputClass} pl-9 sm:w-56`} />
          </div>
          <Btn variant="secondary" onClick={() => setImportOpen(true)}><FileUp className="h-4 w-4" />Import</Btn>
          <Btn onClick={() => setDraft(emptyDraft())}><Plus className="h-4 w-4" />New question</Btn>
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title={questions.length ? "No questions match" : "Your question bank is empty"} description={questions.length ? "Try a different filter." : "Add questions one by one, or import them from JSON or PDF."} action={!questions.length && <Btn onClick={() => setDraft(emptyDraft())}><Plus className="h-4 w-4" />Add first question</Btn>} />
        </Card>
      ) : (
        <Card className="divide-y divide-white/[0.05]">
          {visible.map((q) => (
            <div key={q.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm text-slate-100">{q.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge tone={q.status === "PUBLISHED" ? "emerald" : "amber"}>{q.status === "PUBLISHED" ? "Published" : "Draft"}</Badge>
                  <Badge>{q.subject}</Badge>
                  <Badge>{q.topic}</Badge>
                  <Badge tone="violet">{TYPES.find((t) => t.id === q.questionType)?.label ?? q.questionType}</Badge>
                  <span className="text-[11px] text-slate-500">+{q.marks}/−{q.negativeMarks} · answer {q.correctOption} · in {q._count.tests} test{q._count.tests === 1 ? "" : "s"}</span>
                  {q.tags.includes("needs-answer-review") && <Badge tone="rose">Check answer</Badge>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Btn size="sm" variant="ghost" onClick={() => toggleStatus(q)}>{q.status === "PUBLISHED" ? "Unpublish" : "Publish"}</Btn>
                <button onClick={() => openEdit(q)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Edit question"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(q)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" aria-label="Delete question"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit question" : "New question"}
        size="lg"
        footer={<><Btn variant="secondary" onClick={() => setDraft(null)}>Cancel</Btn><Btn loading={saving} onClick={save}>{draft?.id ? "Save changes" : "Add question"}</Btn></>}
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Question">
              <textarea rows={4} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} className={inputClass} placeholder="Type the question stem…" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Type">
                <select value={draft.questionType} onChange={(e) => setDraft({ ...draft, questionType: e.target.value, correctOption: e.target.value === "NUMERICAL" ? "" : "A" })} className={inputClass}>
                  {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Difficulty">
                <select value={draft.difficulty} onChange={(e) => setDraft({ ...draft, difficulty: e.target.value })} className={inputClass}>
                  <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={inputClass}>
                  <option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option>
                </select>
              </Field>
            </div>

            {draft.questionType === "NUMERICAL" ? (
              <Field label="Correct answer" hint="Students' answers within 0.1% (or ±0.01) are accepted.">
                <input value={draft.correctOption} onChange={(e) => setDraft({ ...draft, correctOption: e.target.value })} className={inputClass} placeholder="e.g. -2 or 9.81" />
              </Field>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-300">Options <span className="font-normal text-slate-500">— {isMulti ? "tick every correct option" : "select the correct option"}</span></p>
                {draft.options.map((o, i) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <input
                      type={isMulti ? "checkbox" : "radio"}
                      name="correct"
                      checked={correctSet.has(o.id)}
                      onChange={() => {
                        if (!isMulti) return setDraft({ ...draft, correctOption: o.id });
                        const next = new Set(correctSet);
                        if (next.has(o.id)) next.delete(o.id); else next.add(o.id);
                        setDraft({ ...draft, correctOption: [...next].sort().join(",") });
                      }}
                      className="h-4 w-4 accent-emerald-500"
                      aria-label={`Mark option ${o.id} correct`}
                    />
                    <span className="w-5 text-sm font-semibold text-slate-400">{o.id}</span>
                    <input value={o.text} onChange={(e) => setDraft({ ...draft, options: draft.options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} className={inputClass} placeholder={`Option ${o.id}`} />
                    {draft.options.length > 2 && (
                      <button onClick={() => setDraft({ ...draft, options: draft.options.filter((_, j) => j !== i).map((x, j) => ({ ...x, id: LETTERS[j] })), correctOption: "A" })} className="p-1 text-slate-500 hover:text-rose-400" aria-label="Remove option"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
                {draft.options.length < LETTERS.length && (
                  <button onClick={() => setDraft({ ...draft, options: [...draft.options, { id: LETTERS[draft.options.length], text: "" }] })} className="text-xs font-semibold text-blue-400 hover:text-blue-300">+ Add option</button>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Subject"><input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className={inputClass} placeholder="Physics" list="qb-subjects" /></Field>
              <Field label="Chapter"><input value={draft.chapter} onChange={(e) => setDraft({ ...draft, chapter: e.target.value })} className={inputClass} placeholder="Laws of Motion" /></Field>
              <Field label="Topic"><input value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} className={inputClass} placeholder="Newton's 2nd law" /></Field>
              <Field label="Marks"><input type="number" min={0.25} step={0.25} value={draft.marks} onChange={(e) => setDraft({ ...draft, marks: Number(e.target.value) })} className={inputClass} /></Field>
              <Field label="Negative marks"><input type="number" min={0} step={0.25} value={draft.negativeMarks} onChange={(e) => setDraft({ ...draft, negativeMarks: Number(e.target.value) })} className={inputClass} /></Field>
              <Field label="Exam category"><input value={draft.examCategory} onChange={(e) => setDraft({ ...draft, examCategory: e.target.value })} className={inputClass} placeholder="JEE, NEET, PLAB…" /></Field>
            </div>
            <datalist id="qb-subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
            <Field label="Explanation (shown after submission)">
              <textarea rows={3} value={draft.explanation} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Tags" hint="Comma separated">
              <input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} className={inputClass} />
            </Field>
          </div>
        )}
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import questions" size="lg">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-white/[0.08] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><FileJson className="h-4 w-4 text-blue-400" />JSON file</div>
            <p className="text-xs text-slate-400">Upload an array of questions. Invalid rows are skipped and reported.</p>
            <pre className="max-h-40 overflow-auto rounded-lg bg-black/40 p-3 text-[11px] text-slate-400">{JSON_SAMPLE}</pre>
            <input ref={jsonInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && uploadJson(e.target.files[0])} />
            <Btn variant="secondary" className="w-full" loading={uploading} onClick={() => jsonInput.current?.click()}>Choose JSON file</Btn>
          </div>
          <div className="space-y-3 rounded-xl border border-white/[0.08] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><FileUp className="h-4 w-4 text-violet-400" />PDF with AI extraction</div>
            <p className="text-xs text-slate-400">Questions are imported as drafts so you can check them before publishing. Requires GEMINI_API_KEY on the server.</p>
            <Field label="Question paper (PDF)"><input type="file" accept="application/pdf" onChange={(e) => setPdf({ ...pdf, q: e.target.files?.[0] ?? null })} className="text-xs text-slate-300" /></Field>
            <Field label="Answer key (PDF, optional)"><input type="file" accept="application/pdf" onChange={(e) => setPdf({ ...pdf, a: e.target.files?.[0] ?? null })} className="text-xs text-slate-300" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <input value={pdf.name} onChange={(e) => setPdf({ ...pdf, name: e.target.value })} placeholder="Set name" className={inputClass} />
              <input value={pdf.subject} onChange={(e) => setPdf({ ...pdf, subject: e.target.value })} placeholder="Subject" className={inputClass} />
            </div>
            <Btn className="w-full" loading={uploading} disabled={!pdf.q} onClick={uploadPdf}>Extract questions</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

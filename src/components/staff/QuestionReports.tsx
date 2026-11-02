"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Flag, Pencil, RotateCcw, XCircle } from "lucide-react";
import { Badge, Btn, Card, EmptyState, ErrorState, Field, Modal, PageLoader, Tabs, formatDate, inputClass } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";

interface Report {
  id: string;
  reason: string;
  details: string | null;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  canEdit: boolean;
  user: { name: string; email: string };
  question: { id: string; text: string; options: string; correctOption: string; explanation: string | null; subject: string; topic: string; questionType: string };
}

const REASON_LABELS: Record<string, string> = {
  WRONG_ANSWER: "Wrong answer key",
  UNCLEAR: "Unclear",
  TYPO: "Typo / formatting",
  OUTDATED: "Outdated",
  OTHER: "Other",
};

const parseOptions = (raw: string): { id: string; text: string }[] => {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

/** Faculty/admin queue of question error reports from students. */
export function QuestionReports() {
  const [status, setStatus] = useState<"OPEN" | "RESOLVED" | "DISMISSED">("OPEN");
  const { data, error, loading, reload } = useApi<{ reports: Report[]; counts: Record<string, number> }>(`/api/question-reports?status=${status}`);
  const [editing, setEditing] = useState<Report | null>(null);
  const [fix, setFix] = useState({ correctOption: "", explanation: "", note: "" });
  const [saving, setSaving] = useState(false);

  const setReportStatus = async (r: Report, next: Report["status"], resolution?: string) => {
    try {
      const res = await apiFetch<{ updated: number }>(`/api/question-reports/${r.id}`, { method: "PATCH", json: { status: next, resolution } });
      toast.success(next === "OPEN" ? "Report reopened" : `${res.updated} report${res.updated === 1 ? "" : "s"} ${next.toLowerCase()}`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update report");
    }
  };

  const openFix = (r: Report) => {
    setEditing(r);
    setFix({ correctOption: r.question.correctOption, explanation: r.question.explanation ?? "", note: "" });
  };

  // Fix the question, then resolve every open report on it
  const saveFix = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiFetch(`/api/questions/${editing.question.id}`, { method: "PATCH", json: { correctOption: fix.correctOption, explanation: fix.explanation } });
      await setReportStatus(editing, "RESOLVED", fix.note || "Question corrected");
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the question");
    } finally {
      setSaving(false);
    }
  };

  const counts = data?.counts ?? {};
  return (
    <div className="space-y-5">
      <Tabs
        value={status}
        onChange={setStatus}
        items={[
          { id: "OPEN", label: "Open", count: counts.OPEN ?? 0 },
          { id: "RESOLVED", label: "Resolved", count: counts.RESOLVED ?? 0 },
          { id: "DISMISSED", label: "Dismissed", count: counts.DISMISSED ?? 0 },
        ]}
      />

      {loading ? <PageLoader /> : error || !data ? <ErrorState message={error || "Failed to load"} onRetry={reload} /> : data.reports.length === 0 ? (
        <Card><EmptyState icon={Flag} title={status === "OPEN" ? "No open reports" : "Nothing here"} description="When students flag a question as wrong or unclear, it shows up here." /></Card>
      ) : (
        <div className="space-y-3">
          {data.reports.map((r) => {
            const options = parseOptions(r.question.options);
            return (
              <Card key={r.id} className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={r.reason === "WRONG_ANSWER" ? "rose" : "amber"}>{REASON_LABELS[r.reason] ?? r.reason}</Badge>
                  <Badge>{r.question.subject}</Badge>
                  <span className="text-xs text-slate-500">{r.question.topic}</span>
                  <span className="ml-auto text-xs text-slate-500">{r.user.name} · {formatDate(r.createdAt)}</span>
                </div>
                <p className="line-clamp-3 whitespace-pre-wrap text-sm text-slate-100">{r.question.text}</p>
                {options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {options.map((o) => {
                      const isCorrect = r.question.correctOption.split(",").includes(o.id.toUpperCase());
                      return <span key={o.id} className={isCorrect ? "rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-300" : "rounded-md bg-white/[0.04] px-2 py-1 text-slate-400"}>{o.id}. {o.text.slice(0, 60)}</span>;
                    })}
                  </div>
                )}
                {r.details && <p className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-sm italic text-slate-300">&ldquo;{r.details}&rdquo;</p>}
                {r.resolution && <p className="text-xs text-slate-400">Resolution: {r.resolution}</p>}
                <div className="flex flex-wrap justify-end gap-2">
                  {r.status === "OPEN" ? (
                    <>
                      <Btn size="sm" variant="ghost" onClick={() => setReportStatus(r, "DISMISSED", "No change needed")}><XCircle className="h-3.5 w-3.5" />Dismiss</Btn>
                      {r.canEdit
                        ? <Btn size="sm" onClick={() => openFix(r)}><Pencil className="h-3.5 w-3.5" />Fix question</Btn>
                        : <span className="self-center text-[11px] text-slate-500">Platform question — read-only</span>}
                      <Btn size="sm" variant="success" onClick={() => setReportStatus(r, "RESOLVED", "Fixed")}><CheckCircle2 className="h-3.5 w-3.5" />Mark fixed</Btn>
                    </>
                  ) : (
                    <Btn size="sm" variant="ghost" onClick={() => setReportStatus(r, "OPEN")}><RotateCcw className="h-3.5 w-3.5" />Reopen</Btn>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Fix question"
        description="Saving updates the question bank and resolves all open reports on it. Past results are not re-graded."
        footer={<><Btn variant="secondary" onClick={() => setEditing(null)}>Cancel</Btn><Btn loading={saving} onClick={saveFix}>Save & resolve</Btn></>}
      >
        {editing && (
          <div className="space-y-4">
            <p className="whitespace-pre-wrap text-sm text-slate-200">{editing.question.text}</p>
            <Field label="Correct answer" hint={editing.question.questionType === "NUMERICAL" ? "Numeric value" : `Option id(s), e.g. B${editing.question.questionType === "MULTIPLE_CHOICE" ? " or A,C" : ""}`}>
              <input value={fix.correctOption} onChange={(e) => setFix({ ...fix, correctOption: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Explanation">
              <textarea rows={5} value={fix.explanation} onChange={(e) => setFix({ ...fix, explanation: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Note to record (optional)">
              <input value={fix.note} onChange={(e) => setFix({ ...fix, note: e.target.value })} placeholder="e.g. Updated per NICE 2026 guideline" className={inputClass} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}

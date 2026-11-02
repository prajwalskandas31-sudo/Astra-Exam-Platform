"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Copy, MessageSquare, Search, Send, Users } from "lucide-react";
import { TestReview } from "@/components/student/TestReview";
import { Badge, Btn, Card, CardHeader, EmptyState, ErrorState, Modal, PageHeader, PageLoader, Tabs, formatDate, inputClass, scoreTone } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

interface StudentAttempt {
  id: string;
  status: string;
  isRetry: boolean;
  score: number | null;
  percentage: number | null;
  accuracy: number | null;
  rank: number | null;
  mentorComment: string | null;
  weakTopics: string | null;
  createdAt: string;
  test: { id: string; title: string; type: string; mode: string };
}

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  batch: { id: string; name: string } | null;
  studentLinks: { parent: { id: string; name: string; phone: string | null; email: string } }[];
  attempts: StudentAttempt[];
}

const finished = (a: StudentAttempt) => a.status === "COMPLETED" || a.status === "AUTO_SUBMITTED";

export default function MentorStudentsPage() {
  const { data, setData, error, loading, reload } = useApi<Student[]>("/api/mentor/students");
  const [query, setQuery] = useState("");
  const [batch, setBatch] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<StudentAttempt | null>(null);
  const [tab, setTab] = useState<"feedback" | "review">("feedback");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  const students = data ?? [];
  const batches = useMemo(() => Array.from(new Set(students.map((s) => s.batch?.name).filter(Boolean))) as string[], [students]);
  const rows = students
    .map((s) => {
      const done = s.attempts.filter((a) => finished(a) && !a.isRetry);
      const avg = done.length ? done.reduce((sum, a) => sum + (a.percentage || 0), 0) / done.length : null;
      return { ...s, done, avg };
    })
    .filter((s) =>
      (batch === "ALL" || (batch === "NONE" ? !s.batch : s.batch?.name === batch)) &&
      (!query || `${s.name} ${s.email}`.toLowerCase().includes(query.toLowerCase()))
    );
  const selected = rows.find((s) => s.id === selectedId) ?? null;

  const openAttempt = (a: StudentAttempt) => {
    setAttempt(a);
    setComment(a.mentorComment ?? "");
    setReportUrl(null);
    setTab("feedback");
  };

  const saveComment = async () => {
    if (!attempt) return;
    setBusy("comment");
    try {
      await apiFetch(`/api/attempts/${attempt.id}/comment`, { method: "PATCH", json: { comment } });
      setData(students.map((s) => ({ ...s, attempts: s.attempts.map((a) => (a.id === attempt.id ? { ...a, mentorComment: comment } : a)) })));
      toast.success("Feedback saved — the student can see it in their review");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save feedback");
    } finally {
      setBusy(null);
    }
  };

  const dispatch = async (audience: "PARENTS" | "STUDENT" | "BOTH") => {
    if (!attempt) return;
    setBusy(audience);
    try {
      const res = await apiFetch<{ message: string; reportUrl: string; sent: number }>("/api/mentor/dispatch-report", { method: "POST", json: { attemptId: attempt.id, audience } });
      setReportUrl(res.reportUrl);
      if (res.sent > 0) toast.success(res.message);
      else toast.warning(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send report");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <PageLoader label="Loading students…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Students & Reports" description="Review each student's attempts, leave feedback and send report cards to parents." />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" className={`${inputClass} pl-9`} />
        </div>
        <select value={batch} onChange={(e) => setBatch(e.target.value)} className={`${inputClass} sm:w-56`} aria-label="Batch">
          <option value="ALL">All batches</option>
          {batches.map((b) => <option key={b}>{b}</option>)}
          <option value="NONE">Unassigned</option>
        </select>
      </div>

      {students.length === 0 ? (
        <Card><EmptyState icon={Users} title="No students yet" description="Approved students in your institute will appear here." /></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader title={`${rows.length} student${rows.length === 1 ? "" : "s"}`} />
            <ul className="max-h-[70vh] divide-y divide-white/[0.05] overflow-y-auto">
              {rows.map((s) => (
                <li key={s.id}>
                  <button onClick={() => setSelectedId(s.id)} className={cn("flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-white/[0.03]", selectedId === s.id && "bg-blue-600/10")}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">{s.name.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-100">{s.name}</p>
                      <p className="truncate text-xs text-slate-500">{s.batch?.name ?? "Unassigned"} · {s.done.length} test{s.done.length === 1 ? "" : "s"}</p>
                    </div>
                    {s.avg != null ? <Badge tone={scoreTone(s.avg)}>{s.avg.toFixed(0)}%</Badge> : <span className="text-xs text-slate-600">—</span>}
                    <ChevronRight className="h-4 w-4 text-slate-600" />
                  </button>
                </li>
              ))}
              {rows.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-500">No students match.</li>}
            </ul>
          </Card>

          <Card className="lg:col-span-3">
            {!selected ? (
              <EmptyState icon={Users} title="Select a student" description="Pick a student to see their attempts, give feedback and send reports." />
            ) : (
              <>
                <CardHeader title={selected.name} description={`${selected.email}${selected.phone ? ` · ${selected.phone}` : ""}`} />
                <div className="border-b border-white/[0.06] px-5 py-3 text-xs text-slate-400">
                  Parents: {selected.studentLinks.length ? selected.studentLinks.map((l) => `${l.parent.name}${l.parent.phone ? ` (${l.parent.phone})` : ""}`).join(", ") : <span className="text-amber-300">none linked — reports go to the student&apos;s number</span>}
                </div>
                {selected.attempts.length === 0 ? (
                  <EmptyState title="No attempts yet" />
                ) : (
                  <ul className="divide-y divide-white/[0.05]">
                    {selected.attempts.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-slate-200">{a.test.title}{a.isRetry && <span className="text-xs text-slate-500"> · retest</span>}</p>
                          <p className="text-xs text-slate-500">{formatDate(a.createdAt)}{a.mentorComment && " · feedback given"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {finished(a) ? (
                            <>
                              <Badge tone={scoreTone(a.percentage ?? 0)}>{(a.percentage ?? 0).toFixed(1)}%</Badge>
                              <Btn size="sm" variant="secondary" onClick={() => openAttempt(a)}><MessageSquare className="h-3.5 w-3.5" />Open</Btn>
                            </>
                          ) : (
                            <Badge tone="amber">In progress</Badge>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      <Modal open={!!attempt} onClose={() => setAttempt(null)} title={attempt?.test.title ?? ""} description={selected ? `${selected.name} · ${attempt ? formatDate(attempt.createdAt) : ""}` : undefined} size="lg">
        {attempt && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-[11px] text-slate-400">Score</p><p className="text-lg font-bold text-white">{(attempt.percentage ?? 0).toFixed(1)}%</p></div>
              <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-[11px] text-slate-400">Accuracy</p><p className="text-lg font-bold text-white">{(attempt.accuracy ?? 0).toFixed(1)}%</p></div>
              <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-[11px] text-slate-400">Rank</p><p className="text-lg font-bold text-white">{attempt.isRetry ? "—" : `#${attempt.rank ?? 1}`}</p></div>
            </div>
            <Tabs value={tab} onChange={setTab} items={[{ id: "feedback", label: "Feedback & report" }, { id: "review", label: "Answer review" }]} />
            {tab === "review" ? (
              <TestReview attemptId={attempt.id} embedded allowBookmarks={false} />
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-300">Mentor feedback (visible to the student and parents)</p>
                  <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} className={inputClass} placeholder="Strengths, mistakes to fix, what to revise next…" />
                  <Btn loading={busy === "comment"} onClick={saveComment}>Save feedback</Btn>
                </div>
                <div className="space-y-2 border-t border-white/[0.06] pt-4">
                  <p className="text-xs font-medium text-slate-300">Send report card</p>
                  <div className="flex flex-wrap gap-2">
                    <Btn variant="success" loading={busy === "PARENTS"} disabled={!!busy} onClick={() => dispatch("PARENTS")}><Send className="h-4 w-4" />To parents</Btn>
                    <Btn variant="secondary" loading={busy === "STUDENT"} disabled={!!busy} onClick={() => dispatch("STUDENT")}>To student</Btn>
                    <Btn variant="secondary" loading={busy === "BOTH"} disabled={!!busy} onClick={() => dispatch("BOTH")}>To both</Btn>
                  </div>
                  <p className="text-[11px] text-slate-500">Sent by WhatsApp and/or SMS as set up in Admin → Messaging, with a short link to the report card. Delivery status appears in Notification Logs.</p>
                  {reportUrl && (
                    <div className="flex items-center gap-2 rounded-lg bg-black/30 p-2 text-xs">
                      <span className="flex-1 truncate font-mono text-slate-400">{reportUrl}</span>
                      <button onClick={() => { navigator.clipboard.writeText(reportUrl); toast.success("Link copied"); }} className="rounded p-1 text-slate-300 hover:bg-white/10" aria-label="Copy link"><Copy className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

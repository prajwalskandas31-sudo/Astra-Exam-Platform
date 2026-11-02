"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, BarChart3, Download, ListChecks, Users } from "lucide-react";
import { Badge, Btn, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoader, StatCard, Tabs, formatDate, formatDuration, scoreTone } from "@/components/ui/kit";
import { useApi } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

interface Analysis {
  test: { id: string; title: string; type: string; mode: string; duration: number; totalMarks: number; isPublished: boolean; questionCount: number };
  summary: { participants: number; average: number; median: number; highest: number; lowest: number; bands: { label: string; count: number }[] };
  results: {
    attemptId: string; rank: number; student: string; email: string; batch: string; score: number; percentage: number; accuracy: number;
    correct: number; incorrect: number; skipped: number; timeTaken: number | null; violations: number; status: string; submittedAt: string;
  }[];
  items: {
    number: number; id: string; text: string; subject: string; topic: string; difficulty: string; questionType: string; correctOption: string;
    options: string[]; pctCorrect: number; pctAttempted: number; avgTime: number; discrimination: number | null;
    distribution: Record<string, number>; flags: string[];
  }[];
}

/** Results table, score distribution and item analysis for one test (faculty/admin). */
export function TestAnalysis({ testId, backHref }: { testId: string; backHref: string }) {
  const { data, error, loading, reload } = useApi<Analysis>(`/api/tests/${testId}/analysis`);
  const [tab, setTab] = useState<"results" | "items">("results");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  if (loading) return <PageLoader label="Analysing results…" />;
  if (error || !data) return <ErrorState message={error || "Failed to load"} onRetry={reload} />;

  const { test, summary, results, items } = data;
  const maxBand = Math.max(1, ...summary.bands.map((b) => b.count));
  const flagged = items.filter((i) => i.flags.length > 0);
  const visibleItems = flaggedOnly ? flagged : items;

  return (
    <div className="space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />All tests</Link>
      <PageHeader
        title={test.title}
        description={`${test.type.toLowerCase()} · ${test.mode} · ${test.questionCount} questions · ${test.totalMarks} marks · ${test.duration} min`}
        badge={test.isPublished ? <Badge tone="emerald">Published</Badge> : <Badge tone="amber">Not published</Badge>}
        actions={
          results.length > 0 && (
            // The endpoint responds with Content-Disposition: attachment, so this downloads without leaving the page
            <Btn variant="secondary" onClick={() => { window.location.href = `/api/tests/${test.id}/analysis?format=csv`; }}>
              <Download className="h-4 w-4" />Export CSV
            </Btn>
          )
        }
      />

      {summary.participants === 0 ? (
        <Card><EmptyState icon={Users} title="No submissions yet" description="Results and item analysis appear once students submit this test." /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Students" value={summary.participants} icon={Users} tone="blue" />
            <StatCard label="Average" value={`${summary.average}%`} tone="violet" />
            <StatCard label="Median" value={`${summary.median}%`} tone="slate" />
            <StatCard label="Highest" value={`${summary.highest}%`} tone="emerald" />
            <StatCard label="Lowest" value={`${summary.lowest}%`} tone="rose" />
          </div>

          <Card>
            <CardHeader title="Score distribution" description="Number of students in each percentage band" icon={BarChart3} />
            <div className="flex h-40 items-end gap-2 px-5 pb-2 pt-5">
              {summary.bands.map((b) => (
                <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${b.label}: ${b.count}`}>
                  {b.count > 0 && <span className="text-[10px] tabular-nums text-slate-400">{b.count}</span>}
                  <div className="w-full rounded-t bg-blue-500/70" style={{ height: `${(b.count / maxBand) * 100}%`, minHeight: b.count ? 4 : 0 }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-5 pb-4">
              {summary.bands.map((b) => <span key={b.label} className="flex-1 text-center text-[9px] text-slate-500">{b.label.split("–")[0]}</span>)}
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={tab} onChange={setTab} items={[{ id: "results", label: "Results", count: results.length }, { id: "items", label: "Item analysis", count: items.length }]} />
            {tab === "items" && (
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="accent-blue-500" />
                Flagged only ({flagged.length})
              </label>
            )}
          </div>

          {tab === "results" ? (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-white/[0.06] bg-black/20 text-xs text-slate-400">
                    <tr>
                      <th className="px-5 py-3 font-medium">#</th>
                      <th className="px-3 py-3 font-medium">Student</th>
                      <th className="px-3 py-3 font-medium">Batch</th>
                      <th className="px-3 py-3 text-right font-medium">Score</th>
                      <th className="px-3 py-3 text-right font-medium">Accuracy</th>
                      <th className="px-3 py-3 text-right font-medium">✓ / ✗ / –</th>
                      <th className="px-3 py-3 text-right font-medium">Time</th>
                      <th className="px-5 py-3 font-medium">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {results.map((r) => (
                      <tr key={r.attemptId} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-3 tabular-nums text-slate-400">{r.rank}</td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-slate-100">{r.student}</p>
                          <p className="text-xs text-slate-500">{r.email}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-300">{r.batch}</td>
                        <td className="px-3 py-3 text-right"><Badge tone={scoreTone(r.percentage)}>{r.percentage}%</Badge><p className="mt-0.5 text-[11px] tabular-nums text-slate-500">{r.score} / {test.totalMarks}</p></td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-300">{r.accuracy}%</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-400"><span className="text-emerald-400">{r.correct}</span> / <span className="text-rose-400">{r.incorrect}</span> / {r.skipped}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-300">{formatDuration(r.timeTaken)}</td>
                        <td className="px-5 py-3 text-xs text-slate-400">
                          {formatDate(r.submittedAt)}
                          {r.status === "AUTO_SUBMITTED" && <Badge tone="rose" className="ml-1">auto</Badge>}
                          {r.violations > 0 && <Badge tone="amber" className="ml-1">{r.violations} flags</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="flex items-start gap-2 text-xs text-slate-400">
                <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span><b className="text-slate-300">Correct %</b> is the share of students who got the question right. <b className="text-slate-300">Discrimination</b> compares the top 27% with the bottom 27% of scorers: above 0.3 is good, below 0.2 is weak, and a negative value usually means a wrong answer key.</span>
              </p>
              {visibleItems.length === 0 && <Card><EmptyState icon={ListChecks} title="No flagged questions" description="Every question is behaving as expected." /></Card>}
              {visibleItems.map((it) => {
                const total = Object.values(it.distribution).reduce((s, n) => s + n, 0);
                const keys = it.options.length ? it.options.map((o) => o.toUpperCase()) : Object.keys(it.distribution).slice(0, 6);
                const correct = new Set(it.correctOption.split(",").map((s) => s.trim().toUpperCase()));
                return (
                  <Card key={it.id} className={cn("p-5", it.flags.some((f) => f.startsWith("Negative")) && "border-rose-500/30")}>
                    <div className="flex flex-col gap-4 lg:flex-row">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-400">Q{it.number}</span>
                          <Badge>{it.subject}</Badge>
                          <span className="text-[11px] text-slate-500">{it.topic} · {it.difficulty.toLowerCase()}</span>
                          {it.flags.map((f) => <Badge key={f} tone={f.startsWith("Negative") ? "rose" : "amber"}><AlertTriangle className="h-3 w-3" />{f}</Badge>)}
                        </div>
                        <p className="line-clamp-2 text-sm text-slate-200">{it.text}</p>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                          <span>Correct <b className={cn("tabular-nums", it.pctCorrect >= 70 ? "text-emerald-400" : it.pctCorrect >= 40 ? "text-amber-400" : "text-rose-400")}>{it.pctCorrect}%</b></span>
                          <span>Attempted <b className="tabular-nums text-slate-200">{it.pctAttempted}%</b></span>
                          <span>Avg time <b className="tabular-nums text-slate-200">{formatDuration(it.avgTime)}</b></span>
                          <span>Discrimination <b className="tabular-nums text-slate-200">{it.discrimination ?? "—"}</b></span>
                        </div>
                      </div>
                      {total > 0 && it.questionType !== "NUMERICAL" && (
                        <div className="w-full space-y-1 lg:w-56" aria-label="Answer distribution">
                          {keys.map((k) => {
                            const n = it.distribution[k] ?? 0;
                            const pct = Math.round((n / total) * 100);
                            return (
                              <div key={k} className="flex items-center gap-2 text-[11px]">
                                <span className={cn("w-4 font-bold", correct.has(k) ? "text-emerald-400" : "text-slate-500")}>{k}</span>
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                                  <div className={cn("h-full rounded-full", correct.has(k) ? "bg-emerald-500" : "bg-slate-500")} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="w-8 text-right tabular-nums text-slate-400">{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

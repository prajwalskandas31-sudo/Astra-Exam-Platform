"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { TrendChart } from "@/components/charts/TrendChart";
import { Btn, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoader, ProgressBar, StatCard, Tabs, formatDate, scoreTone } from "@/components/ui/kit";
import { useApi } from "@/lib/fetcher";

interface Bucket { name: string; total: number; correct: number; incorrect: number; unattempted: number; accuracy: number; avgTime: number }
interface Insights {
  summary: { testsTaken: number; avgPercentage: number; avgAccuracy: number; bestPercentage: number; totalQuestions: number };
  timeline: { attemptId: string; testTitle: string; isRetry: boolean; date: string; percentage: number; accuracy: number; percentile: number | null }[];
  subjects: Bucket[];
  chapters: Bucket[];
  difficulty: Bucket[];
  questionTypes: Bucket[];
}

type Dimension = "subjects" | "chapters" | "difficulty" | "questionTypes";
type Metric = "percentage" | "accuracy";

const TYPE_LABELS: Record<string, string> = {
  SINGLE_CHOICE: "Single choice", MULTIPLE_CHOICE: "Multiple choice", NUMERICAL: "Numerical",
  ASSERTION_REASON: "Assertion–reason", MATCH_THE_FOLLOWING: "Match the following", PASSAGE: "Passage", IMAGE_BASED: "Image based",
};

function BreakdownTable({ rows, labelFor }: { rows: Bucket[]; labelFor?: (n: string) => string }) {
  if (rows.length === 0) return <p className="p-5 text-sm text-slate-500">No data yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-white/[0.06] text-xs text-slate-400">
          <tr>
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="w-1/3 px-3 py-3 font-medium">Accuracy</th>
            <th className="px-3 py-3 font-medium">Correct</th>
            <th className="px-3 py-3 font-medium">Wrong</th>
            <th className="px-3 py-3 font-medium">Skipped</th>
            <th className="px-3 py-3 font-medium">Avg time / Q</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="px-5 py-3 font-medium text-slate-100">{labelFor ? labelFor(r.name) : r.name}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <ProgressBar value={r.accuracy} tone={scoreTone(r.accuracy)} className="flex-1" />
                  <span className="w-12 text-right tabular-nums text-slate-300">{r.accuracy}%</span>
                </div>
              </td>
              <td className="px-3 py-3 tabular-nums text-emerald-400">{r.correct}</td>
              <td className="px-3 py-3 tabular-nums text-rose-400">{r.incorrect}</td>
              <td className="px-3 py-3 tabular-nums text-slate-400">{r.unattempted}</td>
              <td className="px-3 py-3 tabular-nums text-slate-400">{r.avgTime}s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalysisPage() {
  const { data, error, loading, reload } = useApi<Insights>("/api/student/insights");
  const [dimension, setDimension] = useState<Dimension>("subjects");
  const [metric, setMetric] = useState<Metric>("percentage");
  const [range, setRange] = useState<"all" | "5" | "10">("all");

  if (loading) return <PageLoader label="Crunching your numbers…" />;
  if (error || !data) return <ErrorState message={error || "Failed to load"} onRetry={reload} />;

  if (data.summary.testsTaken === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analysis" description="Deep analytics across score, accuracy, difficulty and time." />
        <Card><EmptyState icon={BarChart3} title="No analysis yet" description="Complete a test and your performance analysis will appear here." action={<Link href="/student/mocks"><Btn>Take a test</Btn></Link>} /></Card>
      </div>
    );
  }

  const timeline = data.timeline.filter((t) => !t.isRetry);
  const ranged = range === "all" ? timeline : timeline.slice(-Number(range));
  const weakest = [...data.chapters].filter((c) => c.correct + c.incorrect > 0).sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader title="Analysis" description="Deep analytics across score, accuracy, difficulty and time." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tests analysed" value={data.summary.testsTaken} />
        <StatCard label="Questions attempted" value={data.summary.totalQuestions} />
        <StatCard label="Average score" value={`${data.summary.avgPercentage}%`} />
        <StatCard label="Average accuracy" value={`${data.summary.avgAccuracy}%`} />
      </div>

      <Card>
        <CardHeader
          title={metric === "percentage" ? "Score over time" : "Accuracy over time"}
          action={
            <div className="flex flex-wrap gap-2">
              <Tabs<Metric> value={metric} onChange={setMetric} items={[{ id: "percentage", label: "Score" }, { id: "accuracy", label: "Accuracy" }]} />
              <Tabs value={range} onChange={setRange} items={[{ id: "all", label: "All" }, { id: "10", label: "Last 10" }, { id: "5", label: "Last 5" }]} />
            </div>
          }
        />
        <div className="p-4">
          {ranged.length >= 2 ? (
            <TrendChart data={ranged.map((t) => ({ label: formatDate(t.date), value: t[metric], detail: t.testTitle }))} />
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">Complete at least two tests to see a trend.</p>
          )}
        </div>
      </Card>

      {weakest.length > 0 && (
        <Card className="border-rose-500/20 bg-rose-500/5 p-5">
          <p className="text-sm font-semibold text-rose-200">Focus areas</p>
          <p className="mt-1 text-sm text-slate-300">
            Your lowest-accuracy chapters are {weakest.map((w, i) => <span key={w.name}><strong className="text-white">{w.name}</strong> ({w.accuracy}%){i < weakest.length - 1 ? ", " : ""}</span>)}.{" "}
            <Link href="/student/practice" className="font-semibold text-rose-300 underline underline-offset-4">Start a targeted retest →</Link>
          </p>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Breakdown"
          action={
            <Tabs<Dimension>
              value={dimension}
              onChange={setDimension}
              items={[
                { id: "subjects", label: "Subject" },
                { id: "chapters", label: "Chapter" },
                { id: "difficulty", label: "Difficulty" },
                { id: "questionTypes", label: "Question type" },
              ]}
            />
          }
        />
        <BreakdownTable
          rows={data[dimension]}
          labelFor={dimension === "questionTypes" ? (n) => TYPE_LABELS[n] ?? n : dimension === "difficulty" ? (n) => n.charAt(0) + n.slice(1).toLowerCase() : undefined}
        />
      </Card>
    </div>
  );
}

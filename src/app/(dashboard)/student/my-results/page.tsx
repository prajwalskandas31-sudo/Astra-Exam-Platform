"use client";

import Link from "next/link";
import { Award, ChevronRight } from "lucide-react";
import { Badge, Btn, Card, EmptyState, ErrorState, PageHeader, PageLoader, StatCard, formatDate, formatDuration, scoreTone } from "@/components/ui/kit";
import { useApi } from "@/lib/fetcher";

interface Insights {
  summary: { testsTaken: number; avgPercentage: number; avgAccuracy: number; bestPercentage: number };
  timeline: {
    attemptId: string; testTitle: string; testType: string; isRetry: boolean; date: string; score: number;
    percentage: number; accuracy: number; rank: number | null; percentile: number | null;
    correct: number; incorrect: number; unattempted: number; total: number; timeTaken: number | null;
  }[];
}

export default function MyResultsPage() {
  const { data, error, loading, reload } = useApi<Insights>("/api/student/insights");

  if (loading) return <PageLoader label="Loading results…" />;
  if (error || !data) return <ErrorState message={error || "Failed to load"} onRetry={reload} />;

  const rows = [...data.timeline].reverse();

  return (
    <div className="space-y-6">
      <PageHeader title="My Results" description="Scorecards for every test you've submitted." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tests taken" value={data.summary.testsTaken} />
        <StatCard label="Average score" value={`${data.summary.avgPercentage}%`} />
        <StatCard label="Best score" value={`${data.summary.bestPercentage}%`} />
        <StatCard label="Average accuracy" value={`${data.summary.avgAccuracy}%`} />
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={Award} title="No results yet" description="Submit a test to see your scorecard here." action={<Link href="/student/mocks"><Btn>Find a test</Btn></Link>} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-white/[0.06] bg-black/20 text-xs text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Test</th>
                  <th className="px-3 py-3 font-medium">Score</th>
                  <th className="px-3 py-3 font-medium">Accuracy</th>
                  <th className="px-3 py-3 font-medium">✓ / ✗ / –</th>
                  <th className="px-3 py-3 font-medium">Rank</th>
                  <th className="px-3 py-3 font-medium">Time</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {rows.map((r) => (
                  <tr key={r.attemptId} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-100">{r.testTitle}</p>
                      <p className="text-xs text-slate-500">{formatDate(r.date)}{r.isRetry && " · retest"}</p>
                    </td>
                    <td className="px-3 py-3"><Badge tone={scoreTone(r.percentage)}>{r.percentage}%</Badge><span className="ml-2 text-xs text-slate-500">{r.score} marks</span></td>
                    <td className="px-3 py-3 tabular-nums text-slate-300">{r.accuracy}%</td>
                    <td className="px-3 py-3 tabular-nums text-xs"><span className="text-emerald-400">{r.correct}</span> / <span className="text-rose-400">{r.incorrect}</span> / <span className="text-slate-400">{r.unattempted}</span></td>
                    <td className="px-3 py-3 tabular-nums text-slate-300">{r.isRetry || !r.rank ? "—" : `#${r.rank}`}</td>
                    <td className="px-3 py-3 text-slate-400">{formatDuration(r.timeTaken)}</td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/exam/${r.attemptId}/results`} className="inline-flex items-center text-xs font-semibold text-blue-400 hover:text-blue-300">
                        Details <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

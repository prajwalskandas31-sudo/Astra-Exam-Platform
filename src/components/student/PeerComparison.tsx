"use client";

import { Medal, Trophy, Users } from "lucide-react";
import { Card, CardHeader, formatDuration } from "@/components/ui/kit";
import { cn } from "@/lib/utils";

interface Line {
  score: number;
  percentage: number;
  accuracy: number;
  timeTaken: number | null;
}

export interface CompareData {
  ranked: boolean;
  participants: number;
  you: Line;
  topper: Line | null;
  average: Line | null;
  subjects: { name: string; you: number; topper: number; average: number }[];
  leaderboard: { rank: number; name: string; score: number; percentage: number; timeTaken: number | null; isSubject: boolean }[];
  questions: Record<string, { pctCorrect: number; pctAttempted: number; avgTime: number }>;
}

const ROWS = [
  { key: "you", label: "You", bar: "bg-blue-500" },
  { key: "average", label: "Average", bar: "bg-slate-400" },
  { key: "topper", label: "Topper", bar: "bg-amber-400" },
] as const;

function MetricBars({ title, values, format = (v: number) => `${v}%`, max = 100 }: {
  title: string;
  values: Partial<Record<(typeof ROWS)[number]["key"], number | null>>;
  format?: (v: number) => string;
  max?: number;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-400">{title}</p>
      {ROWS.map((r) => {
        const v = values[r.key];
        if (v == null) return null;
        return (
          <div key={r.key} className="flex items-center gap-3 text-xs">
            <span className="w-14 shrink-0 text-slate-400">{r.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div className={cn("h-full rounded-full", r.bar)} style={{ width: `${Math.max(0, Math.min(100, (v / (max || 1)) * 100))}%` }} />
            </div>
            <span className="w-14 shrink-0 text-right tabular-nums text-slate-200">{format(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** You vs average vs topper for one test, plus the top-10 leaderboard. */
export function PeerComparison({ data }: { data: CompareData }) {
  if (data.participants < 2) {
    return (
      <Card className="flex items-center gap-3 p-5 text-sm text-slate-400">
        <Users className="h-4 w-4 shrink-0" />
        {data.ranked ? "You're one of the first to take this test — comparison with peers appears once others submit." : "Practice attempts aren't compared with other students."}
      </Card>
    );
  }
  const maxTime = Math.max(data.you.timeTaken ?? 0, data.average?.timeTaken ?? 0, data.topper?.timeTaken ?? 0);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader title="How you compare" description={`Against ${data.participants} students who took this test`} icon={Users} />
        <div className="grid gap-6 p-5 sm:grid-cols-2">
          <MetricBars title="Score" values={{ you: data.you.percentage, average: data.average?.percentage, topper: data.topper?.percentage }} />
          <MetricBars title="Accuracy" values={{ you: data.you.accuracy, average: data.average?.accuracy, topper: data.topper?.accuracy }} />
          {maxTime > 0 && (
            <MetricBars
              title="Time taken"
              values={{ you: data.you.timeTaken, average: data.average?.timeTaken, topper: data.topper?.timeTaken }}
              format={(v) => formatDuration(v)}
              max={maxTime}
            />
          )}
        </div>
        {data.subjects.length > 0 && (
          <div className="overflow-x-auto border-t border-white/[0.06]">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Subject</th>
                  <th className="px-3 py-2.5 text-right font-medium text-blue-300">You</th>
                  <th className="px-3 py-2.5 text-right font-medium">Average</th>
                  <th className="px-5 py-2.5 text-right font-medium text-amber-300">Topper</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] tabular-nums">
                {data.subjects.map((s) => (
                  <tr key={s.name}>
                    <td className="px-5 py-2.5 text-slate-200">{s.name}</td>
                    <td className={cn("px-3 py-2.5 text-right font-semibold", s.you >= s.average ? "text-emerald-400" : "text-rose-400")}>{s.you}%</td>
                    <td className="px-3 py-2.5 text-right text-slate-400">{s.average}%</td>
                    <td className="px-5 py-2.5 text-right text-slate-300">{s.topper}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader title="Leaderboard" description="Top 10 on this test" icon={Trophy} />
        <ol className="divide-y divide-white/[0.05]">
          {data.leaderboard.map((row, i) => (
            <li key={i} className={cn("flex items-center gap-3 px-5 py-2.5 text-sm", row.isSubject && "bg-blue-500/10")}>
              <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                row.rank === 1 ? "bg-amber-400/20 text-amber-300" : row.rank === 2 ? "bg-slate-300/15 text-slate-200" : row.rank === 3 ? "bg-orange-500/15 text-orange-300" : "text-slate-500")}>
                {row.rank <= 3 ? <Medal className="h-3.5 w-3.5" /> : row.rank}
              </span>
              <span className={cn("min-w-0 flex-1 truncate", row.isSubject ? "font-semibold text-white" : "text-slate-300")}>
                {row.name}{row.isSubject && " (you)"}
              </span>
              <span className="tabular-nums text-slate-300">{row.percentage}%</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

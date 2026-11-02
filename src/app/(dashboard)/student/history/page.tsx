"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { Badge, Card, EmptyState, ErrorState, PageHeader, PageLoader, formatDate } from "@/components/ui/kit";
import { useApi } from "@/lib/fetcher";

interface HistoryAttempt {
  id: string;
  status: string;
  isRetry: boolean;
  percentage: number | null;
  createdAt: string;
  endTime: string | null;
  test: { title: string; type: string; mode: string; _count: { questions: number } };
}

const STATUS: Record<string, { label: string; tone: "emerald" | "amber" | "rose" | "slate" }> = {
  COMPLETED: { label: "Completed", tone: "emerald" },
  AUTO_SUBMITTED: { label: "Auto-submitted", tone: "rose" },
  IN_PROGRESS: { label: "In progress", tone: "amber" },
  PAUSED: { label: "Paused", tone: "amber" },
};

export default function HistoryPage() {
  const { data, error, loading, reload } = useApi<HistoryAttempt[]>("/api/attempts/history");

  if (loading) return <PageLoader label="Loading history…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const attempts = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Attempt History" description="Every attempt you've made, including retests and unfinished papers." />
      {attempts.length === 0 ? (
        <Card><EmptyState icon={Clock} title="No attempts yet" description="Your attempt history will appear here." /></Card>
      ) : (
        <Card>
          <ol className="divide-y divide-white/[0.05]">
            {attempts.map((a) => {
              const finished = a.status === "COMPLETED" || a.status === "AUTO_SUBMITTED";
              const st = STATUS[a.status] ?? { label: a.status, tone: "slate" as const };
              return (
                <li key={a.id}>
                  <Link href={finished ? `/exam/${a.id}/results` : `/exam/${a.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.02]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{a.test.title}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(a.createdAt)} · {a.test.mode} · {a.test._count.questions} questions{a.isRetry && " · retest"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {finished && a.percentage != null && <span className="text-sm font-semibold tabular-nums text-white">{a.percentage.toFixed(1)}%</span>}
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </Card>
      )}
    </div>
  );
}

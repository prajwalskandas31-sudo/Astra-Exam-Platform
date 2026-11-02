"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, Target } from "lucide-react";
import { Badge, Btn, Card, EmptyState, ErrorState, PageHeader, PageLoader, formatDate, scoreTone } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { CustomQuizBuilder } from "@/components/student/CustomQuizBuilder";

interface Insights {
  timeline: { attemptId: string; testTitle: string; isRetry: boolean; date: string; percentage: number; correct: number; incorrect: number; unattempted: number }[];
}

const MODES = [
  { id: "RETRY_INCORRECT", label: "Wrong answers", key: "incorrect" as const },
  { id: "RETRY_UNATTEMPTED", label: "Skipped", key: "unattempted" as const },
  { id: "WEAK_TOPICS", label: "Weak topics", key: null },
  { id: "RETRY_ALL", label: "Full paper", key: null },
];

export default function PracticePage() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<Insights>("/api/student/insights");
  const [busy, setBusy] = useState<string | null>(null);

  const retest = async (attemptId: string, mode: string) => {
    setBusy(`${attemptId}:${mode}`);
    try {
      const res = await apiFetch<{ attemptId: string; questionCount: number }>("/api/attempts/retest", { method: "POST", json: { parentAttemptId: attemptId, mode } });
      toast.success(`Retest created with ${res.questionCount} questions`);
      router.push(`/exam/${res.attemptId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create retest");
      setBusy(null);
    }
  };

  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error || "Failed to load"} onRetry={reload} />;

  const attempts = data.timeline.filter((t) => !t.isRetry).reverse();
  const retests = data.timeline.filter((t) => t.isRetry).reverse();

  return (
    <div className="space-y-6">
      <PageHeader title="Practice & Retests" description="Build your own quiz, or turn any submitted test into a focused practice round — wrong answers, skipped questions or weak topics only." />

      <CustomQuizBuilder />

      <h2 className="text-base font-semibold text-white">Retest a past paper</h2>

      {attempts.length === 0 ? (
        <Card><EmptyState icon={Target} title="No submitted tests yet" description="Submit a test first, then come back to retry the questions you missed." action={<Link href="/student/mocks"><Btn>Take a test</Btn></Link>} /></Card>
      ) : (
        <div className="space-y-3">
          {attempts.map((a) => (
            <Card key={a.attemptId} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-white">{a.testTitle}</p>
                    <Badge tone={scoreTone(a.percentage)}>{a.percentage}%</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDate(a.date)} · <span className="text-rose-400">{a.incorrect} wrong</span> · {a.unattempted} skipped
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MODES.map((m) => {
                    const count = m.key ? a[m.key] : null;
                    return (
                      <Btn
                        key={m.id}
                        size="sm"
                        variant="secondary"
                        disabled={count === 0 || !!busy}
                        loading={busy === `${a.attemptId}:${m.id}`}
                        onClick={() => retest(a.attemptId, m.id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />{m.label}{count != null ? ` (${count})` : ""}
                      </Btn>
                    );
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {retests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Past retests &amp; custom quizzes</h2>
          <Card className="divide-y divide-white/[0.05]">
            {retests.map((r) => (
              <Link key={r.attemptId} href={`/exam/${r.attemptId}/results`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-white/[0.02]">
                <span className="text-slate-200">{r.testTitle} <span className="text-xs text-slate-500">· {formatDate(r.date)}</span></span>
                <Badge tone={scoreTone(r.percentage)}>{r.percentage}%</Badge>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Award, CheckCircle2, Clock, MinusCircle, RotateCcw, Target, TrendingUp, XCircle, ArrowLeft, ShieldAlert } from "lucide-react";
import { TestReview } from "@/components/student/TestReview";
import { PeerComparison, type CompareData } from "@/components/student/PeerComparison";
import { Badge, Btn, Card, CardHeader, ErrorState, PageLoader, ProgressBar, StatCard, Tabs, formatDuration, scoreTone } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

interface ResultAttempt {
  id: string;
  status: string;
  isRetry: boolean;
  score: number | null;
  maxScore: number;
  percentage: number | null;
  accuracy: number | null;
  correctCount: number | null;
  incorrectCount: number | null;
  unattemptedCount: number | null;
  rank: number | null;
  percentile: number | null;
  startTime: string;
  endTime: string | null;
  subjectScores: string | null;
  weakTopics: string | null;
  strongTopics: string | null;
  violationCount: number;
  test: { title: string; ownerId: string | null };
}

const parse = <T,>(s: string | null, fallback: T): T => {
  try {
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
};

export default function ResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const router = useRouter();
  const { data, error, loading, reload } = useApi<ResultAttempt>(`/api/attempts/${attemptId}`);
  const finishedAttempt = !!data && (data.status === "COMPLETED" || data.status === "AUTO_SUBMITTED");
  const compare = useApi<CompareData>(finishedAttempt ? `/api/attempts/${attemptId}/compare` : null);
  const [tab, setTab] = useState<"summary" | "review">("summary");
  const [retesting, setRetesting] = useState<string | null>(null);
  const unfinished = !!data && data.status !== "COMPLETED" && data.status !== "AUTO_SUBMITTED";

  useEffect(() => {
    if (unfinished) router.replace(`/exam/${attemptId}`);
  }, [unfinished, attemptId, router]);

  const startRetest = async (mode: string) => {
    setRetesting(mode);
    try {
      const res = await apiFetch<{ attemptId: string; questionCount: number }>("/api/attempts/retest", { method: "POST", json: { parentAttemptId: attemptId, mode } });
      toast.success(`Retest ready with ${res.questionCount} question${res.questionCount === 1 ? "" : "s"}`);
      router.push(`/exam/${res.attemptId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create retest");
      setRetesting(null);
    }
  };

  if (loading) return <div className="flex-1 overflow-y-auto"><PageLoader label="Calculating your results…" /></div>;
  if (error || !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md"><ErrorState message={error || "Results not found"} onRetry={reload} /></div>
      </div>
    );
  }
  if (unfinished) return null;

  const pct = data.percentage ?? 0;
  const tone = scoreTone(pct);
  const subjects = Object.entries(parse<Record<string, { total: number; correct: number; incorrect: number; score: number; maxScore: number }>>(data.subjectScores, {}));
  const weak = parse<string[]>(data.weakTopics, []);
  const strong = parse<string[]>(data.strongTopics, []);
  const timeTaken = data.endTime ? Math.round((new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 1000) : null;
  const verdict = pct >= 75 ? "Excellent work!" : pct >= 50 ? "Good effort — keep going" : "Needs more practice";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/student/my-results" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> My results
          </Link>
          <Tabs value={tab} onChange={setTab} items={[{ id: "summary", label: "Summary" }, { id: "review", label: "Review answers" }]} />
        </div>

        {tab === "review" ? (
          <TestReview attemptId={attemptId} peerStats={compare.data && compare.data.participants > 1 ? compare.data.questions : undefined} />
        ) : (
          <>
            <Card className="relative overflow-hidden p-6 sm:p-8">
              <div className={cn("pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-20 blur-[100px]", tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-rose-500")} />
              <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {data.test.ownerId ? <Badge tone="blue">Custom quiz</Badge> : data.isRetry && <Badge tone="amber">Retest</Badge>}
                    {data.status === "AUTO_SUBMITTED" && <Badge tone="rose">Auto-submitted</Badge>}
                  </div>
                  <h1 className="text-2xl font-bold text-white sm:text-3xl">{data.test.title}</h1>
                  <p className="mt-1 text-sm text-slate-400">{verdict}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className={cn("text-5xl font-black tabular-nums sm:text-6xl", tone === "emerald" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-rose-400")}>
                    {pct.toFixed(1)}%
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    <span className="font-semibold text-white">{data.score ?? 0}</span> / {data.maxScore} marks
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Accuracy" value={`${(data.accuracy ?? 0).toFixed(1)}%`} hint="Correct ÷ attempted" icon={Target} tone="blue" />
              <StatCard
                label={data.isRetry ? "Rank" : "Rank / percentile"}
                value={data.isRetry ? "—" : `#${data.rank ?? 1}`}
                hint={data.isRetry ? "Practice attempts aren't ranked" : `${data.percentile ?? 100}th percentile`}
                icon={Award}
                tone="violet"
              />
              <StatCard label="Time taken" value={formatDuration(timeTaken)} icon={Clock} tone="amber" />
              <StatCard
                label="Questions"
                value={(data.correctCount ?? 0) + (data.incorrectCount ?? 0) + (data.unattemptedCount ?? 0)}
                hint={
                  <span className="flex gap-2">
                    <span className="inline-flex items-center gap-0.5 text-emerald-400"><CheckCircle2 className="h-3 w-3" />{data.correctCount ?? 0}</span>
                    <span className="inline-flex items-center gap-0.5 text-rose-400"><XCircle className="h-3 w-3" />{data.incorrectCount ?? 0}</span>
                    <span className="inline-flex items-center gap-0.5 text-slate-400"><MinusCircle className="h-3 w-3" />{data.unattemptedCount ?? 0}</span>
                  </span>
                }
                icon={TrendingUp}
                tone="emerald"
              />
            </div>

            {compare.data && !data.isRetry && <PeerComparison data={compare.data} />}

            {data.violationCount > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
                <ShieldAlert className="h-4 w-4 shrink-0" /> {data.violationCount} proctoring violation{data.violationCount === 1 ? " was" : "s were"} recorded during this attempt.
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader title="Subject breakdown" description="Marks and accuracy per subject" />
                <div className="space-y-4 p-5">
                  {subjects.length === 0 && <p className="text-sm text-slate-500">No subject data.</p>}
                  {subjects.map(([name, s]) => {
                    const subjectPct = s.maxScore > 0 ? Math.max(0, (s.score / s.maxScore) * 100) : 0;
                    return (
                      <div key={name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-200">{name}</span>
                          <span className="tabular-nums text-slate-400">
                            {s.score} / {s.maxScore} · <span className="text-emerald-400">{s.correct}✓</span> <span className="text-rose-400">{s.incorrect}✗</span>
                          </span>
                        </div>
                        <ProgressBar value={subjectPct} tone={scoreTone(subjectPct)} />
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader title="Topic insights" />
                <div className="space-y-4 p-5">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-rose-300">Needs attention</p>
                    <div className="flex flex-wrap gap-1.5">
                      {weak.length ? weak.map((t) => <Badge key={t} tone="rose">{t}</Badge>) : <span className="text-xs text-slate-500">No weak topics — great job!</span>}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-emerald-300">Strong</p>
                    <div className="flex flex-wrap gap-1.5">
                      {strong.length ? strong.map((t) => <Badge key={t} tone="emerald">{t}</Badge>) : <span className="text-xs text-slate-500">Keep practising to build strengths.</span>}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <Card>
              <CardHeader title="Improve with a targeted retest" description="Generates a shorter practice attempt from this paper" icon={RotateCcw} />
              <div className="grid gap-3 p-5 sm:grid-cols-3">
                <Btn variant="secondary" loading={retesting === "RETRY_INCORRECT"} disabled={!!retesting || !data.incorrectCount} onClick={() => startRetest("RETRY_INCORRECT")}>
                  Retry incorrect ({data.incorrectCount ?? 0})
                </Btn>
                <Btn variant="secondary" loading={retesting === "WEAK_TOPICS"} disabled={!!retesting || weak.length === 0} onClick={() => startRetest("WEAK_TOPICS")}>
                  Practise weak topics
                </Btn>
                <Btn variant="secondary" loading={retesting === "RETRY_UNATTEMPTED"} disabled={!!retesting || !data.unattemptedCount} onClick={() => startRetest("RETRY_UNATTEMPTED")}>
                  Retry skipped ({data.unattemptedCount ?? 0})
                </Btn>
              </div>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Btn size="lg" onClick={() => setTab("review")}>Review detailed answers</Btn>
              <Btn size="lg" variant="secondary" onClick={() => router.push("/student")}>Back to dashboard</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Award, BarChart3, BookOpen, ChevronRight, ClipboardList, Megaphone, Play, Target, TrendingUp } from "lucide-react";
import { OnboardingModal } from "@/components/student/OnboardingModal";
import { TestCard, testState, type StudentTest } from "@/components/student/TestCard";
import { StudyPlanCard } from "@/components/student/StudyPlan";
import { TrendChart } from "@/components/charts/TrendChart";
import { Badge, Btn, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoader, ProgressBar, StatCard, formatDate, scoreTone } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { useStartTest } from "@/hooks/useStartTest";
import type { StudySnapshot } from "@/lib/studySnapshot";

interface Insights {
  summary: { testsTaken: number; avgPercentage: number; avgAccuracy: number; bestPercentage: number };
  timeline: { attemptId: string; testTitle: string; isRetry: boolean; date: string; percentage: number; accuracy: number }[];
  subjects: { name: string; accuracy: number; total: number }[];
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: string;
  createdAt: string;
  author: { name: string };
}

export default function StudentDashboard() {
  const { data: session } = useSession();
  const tests = useApi<StudentTest[]>("/api/tests");
  const insights = useApi<Insights>("/api/student/insights");
  const announcements = useApi<Announcement[]>("/api/announcements");
  const study = useApi<StudySnapshot>("/api/student/study");
  const { start, startingId } = useStartTest();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    apiFetch<{ onboarded: boolean }>("/api/student/registered-exams")
      .then((r) => setShowOnboarding(!r.onboarded))
      .catch(() => {});
  }, []);

  const handleOnboardingComplete = async (data: { selectedClass: string; selectedStream: string; selectedTrack: string }) => {
    setShowOnboarding(false);
    try {
      await apiFetch("/api/student/registered-exams", { method: "POST", json: { registeredExams: [data.selectedTrack, data.selectedStream].filter(Boolean) } });
      toast.success(`Preferences saved: ${data.selectedTrack}`);
    } catch {
      toast.error("Couldn't save your preferences");
    }
  };

  if (tests.loading || insights.loading) return <PageLoader label="Loading your dashboard…" />;
  if (tests.error) return <ErrorState message={tests.error} onRetry={tests.reload} />;

  const allTests = tests.data ?? [];
  const inProgress = allTests.filter((t) => testState(t).inProgress);
  const notAttempted = allTests.filter((t) => !t.attempts.some((a) => !a.isRetry));
  const summary = insights.data?.summary;
  const timeline = (insights.data?.timeline ?? []).filter((t) => !t.isRetry);
  const recent = [...timeline].reverse().slice(0, 5);
  // Skip honorifics so "Dr. Alex Vance" greets as "Alex"
  const firstName = session?.user?.name?.split(" ").find((p) => !/^(dr|mr|mrs|ms|miss|prof)\.?$/i.test(p)) ?? "there";

  return (
    <div className="space-y-8">
      <OnboardingModal isOpen={showOnboarding} onClose={handleOnboardingComplete} />

      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Pick up where you left off, or start a new test."
        actions={<Link href="/student/mocks"><Btn><ClipboardList className="h-4 w-4" />Browse tests</Btn></Link>}
      />

      {inProgress.length > 0 && (
        <Card className="flex flex-col gap-4 border-amber-500/30 bg-amber-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-200">You have {inProgress.length} unfinished test{inProgress.length > 1 ? "s" : ""}</p>
            <p className="mt-0.5 text-xs text-slate-400">{inProgress[0].title} — the timer keeps running, so resume soon.</p>
          </div>
          <Btn variant="secondary" loading={startingId === inProgress[0].id} onClick={() => start(inProgress[0].id)}>
            <Play className="h-4 w-4" />Resume now
          </Btn>
        </Card>
      )}

      {study.data && <StudyPlanCard data={study.data} onChange={study.setData} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tests completed" value={summary?.testsTaken ?? 0} icon={Award} tone="blue" />
        <StatCard label="Average score" value={`${summary?.avgPercentage ?? 0}%`} icon={TrendingUp} tone="emerald" />
        <StatCard label="Average accuracy" value={`${summary?.avgAccuracy ?? 0}%`} icon={Target} tone="violet" />
        <StatCard label="New tests available" value={notAttempted.length} icon={BookOpen} tone="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Score trend"
            description="Percentage scored on each completed test"
            icon={BarChart3}
            action={<Link href="/student/analysis" className="text-xs font-semibold text-blue-400 hover:text-blue-300">Full analysis →</Link>}
          />
          <div className="p-4">
            {timeline.length >= 2 ? (
              <TrendChart data={timeline.map((t) => ({ label: formatDate(t.date), value: t.percentage, detail: t.testTitle }))} />
            ) : (
              <EmptyState icon={BarChart3} title="Not enough data yet" description="Complete at least two tests to see your score trend." />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Subject accuracy" />
          <div className="space-y-4 p-5">
            {(insights.data?.subjects ?? []).length === 0 && <p className="text-sm text-slate-500">Take a test to see subject-level accuracy.</p>}
            {(insights.data?.subjects ?? []).slice(0, 6).map((s) => (
              <div key={s.name} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-200">{s.name}</span>
                  <span className="tabular-nums text-slate-400">{s.accuracy}%</span>
                </div>
                <ProgressBar value={s.accuracy} tone={scoreTone(s.accuracy)} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Available tests</h2>
          <Link href="/student/mocks" className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300">View all <ChevronRight className="h-4 w-4" /></Link>
        </div>
        {allTests.length === 0 ? (
          <Card><EmptyState icon={ClipboardList} title="No tests published yet" description="Your institute hasn't published any tests. Check back soon." /></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(notAttempted.length ? notAttempted : allTests).slice(0, 6).map((t) => (
              <TestCard key={t.id} test={t} onStart={start} starting={startingId === t.id} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent results" action={<Link href="/student/my-results" className="text-xs font-semibold text-blue-400 hover:text-blue-300">All results →</Link>} />
          {recent.length === 0 ? (
            <EmptyState icon={Award} title="No results yet" description="Your completed tests will show up here." />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {recent.map((r) => (
                <li key={r.attemptId}>
                  <Link href={`/exam/${r.attemptId}/results`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-white/[0.02]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">{r.testTitle}</p>
                      <p className="text-xs text-slate-500">{formatDate(r.date)} · {r.accuracy}% accuracy</p>
                    </div>
                    <Badge tone={scoreTone(r.percentage)}>{r.percentage}%</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Announcements" icon={Megaphone} action={<Link href="/student/messages" className="text-xs font-semibold text-blue-400 hover:text-blue-300">All →</Link>} />
          {(announcements.data ?? []).length === 0 ? (
            <EmptyState icon={Megaphone} title="No announcements" description="Messages from your mentors will appear here." />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {(announcements.data ?? []).slice(0, 4).map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-200">{a.title}</p>
                    {a.priority === "HIGH" && <Badge tone="rose">Important</Badge>}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{a.body}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{a.author.name} · {formatDate(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { AlertTriangle, Award, ClipboardList, MessageSquare, Target, TrendingUp } from "lucide-react";
import { TrendChart } from "@/components/charts/TrendChart";
import { StudyPlanCard } from "@/components/student/StudyPlan";
import { ChildSwitcher, NoChildren, useParentOverview } from "@/components/parent/useParentOverview";
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoader, ProgressBar, StatCard, formatDate, scoreTone } from "@/components/ui/kit";

export default function ParentDashboardPage() {
  const { child, children, select, error, loading, reload } = useParentOverview();

  if (loading) return <PageLoader label="Loading your child's progress…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={child ? `${child.name}'s progress` : "Parent overview"}
        description={child ? `${child.batch} · ${child.email}` : "Track your child's test results, strengths and weak areas."}
        actions={<ChildSwitcher items={children} activeId={child?.id} onSelect={select} />}
      />

      {!child ? <NoChildren /> : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300">Study habits</h2>
            <StudyPlanCard key={child.id} data={child.study} readOnly name={child.name.split(" ")[0]} />
          </section>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Tests completed" value={child.totalTestsAttempted} icon={ClipboardList} tone="blue" />
            <StatCard label="Average score" value={`${child.avgScore}%`} icon={TrendingUp} tone="emerald" />
            <StatCard label="Average accuracy" value={`${child.avgAccuracy}%`} icon={Target} tone="violet" />
            <StatCard
              label="Latest result"
              value={child.latestTest ? `${child.latestTest.percentage}%` : "—"}
              hint={child.latestTest ? `${child.latestTest.title.slice(0, 28)}${child.latestTest.title.length > 28 ? "…" : ""}` : "No tests yet"}
              icon={Award}
              tone="amber"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Score trend" description="Percentage on each completed test" icon={TrendingUp} />
              <div className="p-4">
                {child.attempts.filter((a) => !a.isRetry).length >= 2 ? (
                  <TrendChart data={[...child.attempts].filter((a) => !a.isRetry).reverse().map((a) => ({ label: formatDate(a.createdAt), value: a.percentage, detail: a.test.title }))} />
                ) : (
                  <EmptyState icon={TrendingUp} title="Not enough data yet" description="The trend appears after two completed tests." />
                )}
              </div>
            </Card>
            <Card>
              <CardHeader title="Needs attention" icon={AlertTriangle} action={<Link href="/dashboard/parent/weaknesses" className="text-xs font-semibold text-blue-400">Details →</Link>} />
              <div className="flex flex-wrap gap-1.5 p-5">
                {child.weakTopics.length ? child.weakTopics.map((t) => <Badge key={t} tone="rose">{t}</Badge>) : <p className="text-sm text-slate-500">No weak topics flagged.</p>}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Subject accuracy" />
              <div className="space-y-4 p-5">
                {child.subjects.length === 0 && <p className="text-sm text-slate-500">No data yet.</p>}
                {child.subjects.map((s) => (
                  <div key={s.name} className="space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="text-slate-200">{s.name}</span><span className="tabular-nums text-slate-400">{s.accuracy}%</span></div>
                    <ProgressBar value={s.accuracy} tone={scoreTone(s.accuracy)} />
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <CardHeader title="Recent tests" action={<Link href="/dashboard/parent/reports" className="text-xs font-semibold text-blue-400">All reports →</Link>} />
              {child.attempts.length === 0 ? <EmptyState title="No tests yet" /> : (
                <ul className="divide-y divide-white/[0.05]">
                  {child.attempts.slice(0, 5).map((a) => (
                    <li key={a.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-slate-200">{a.test.title}</p>
                          <p className="text-xs text-slate-500">{formatDate(a.createdAt)}{a.rank && !a.isRetry ? ` · rank #${a.rank}` : ""}{a.isRetry ? " · practice" : ""}</p>
                        </div>
                        <Badge tone={scoreTone(a.percentage)}>{a.percentage}%</Badge>
                      </div>
                      {a.mentorComment && <p className="mt-2 flex gap-1.5 text-xs text-slate-400"><MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />{a.mentorComment}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

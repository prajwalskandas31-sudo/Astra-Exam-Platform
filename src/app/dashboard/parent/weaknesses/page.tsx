"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ChildSwitcher, NoChildren, useParentOverview } from "@/components/parent/useParentOverview";
import { Badge, Card, CardHeader, ErrorState, PageHeader, PageLoader, ProgressBar, scoreTone } from "@/components/ui/kit";

export default function ParentWeaknessesPage() {
  const { child, children, select, error, loading, reload } = useParentOverview();

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const strong = child ? Array.from(new Set(child.attempts.flatMap((a) => a.strongTopics))).filter((t) => !child.weakTopics.includes(t)) : [];
  const weakSubjects = child ? [...child.subjects].sort((a, b) => a.accuracy - b.accuracy) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weakness Tracker"
        description="Topics and subjects where your child is losing marks, so you know what to encourage them to revise."
        actions={<ChildSwitcher items={children} activeId={child?.id} onSelect={select} />}
      />
      {!child ? <NoChildren /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Topics needing attention" description="Below 60% accuracy in recent tests, most frequent first" icon={AlertTriangle} />
            <div className="flex flex-wrap gap-2 p-5">
              {child.weakTopics.length ? child.weakTopics.map((t) => <Badge key={t} tone="rose">{t}</Badge>) : <p className="text-sm text-slate-500">No weak topics flagged yet — great!</p>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Strong topics" description="80%+ accuracy" icon={CheckCircle2} />
            <div className="flex flex-wrap gap-2 p-5">
              {strong.length ? strong.slice(0, 20).map((t) => <Badge key={t} tone="emerald">{t}</Badge>) : <p className="text-sm text-slate-500">Strengths will appear as more tests are taken.</p>}
            </div>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Subjects, weakest first" />
            <div className="space-y-4 p-5">
              {weakSubjects.length === 0 && <p className="text-sm text-slate-500">No data yet.</p>}
              {weakSubjects.map((s) => (
                <div key={s.name} className="space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-slate-200">{s.name}</span><span className="tabular-nums text-slate-400">{s.accuracy}% over {s.questions} questions</span></div>
                  <ProgressBar value={s.accuracy} tone={scoreTone(s.accuracy)} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

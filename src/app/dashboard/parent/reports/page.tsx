"use client";

import { Printer } from "lucide-react";
import { ChildSwitcher, NoChildren, useParentOverview } from "@/components/parent/useParentOverview";
import { Badge, Btn, Card, EmptyState, ErrorState, PageHeader, PageLoader, formatDate, scoreTone } from "@/components/ui/kit";

export default function ParentReportsPage() {
  const { child, children, select, error, loading, reload } = useParentOverview();

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Cards"
        description={child ? `Every submitted test for ${child.name}, with mentor feedback.` : "Test-by-test results for your child."}
        actions={<><ChildSwitcher items={children} activeId={child?.id} onSelect={select} />{child && <Btn variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Btn>}</>}
      />
      {!child ? <NoChildren /> : child.attempts.length === 0 ? (
        <Card><EmptyState title="No reports yet" description={`${child.name} hasn't submitted any tests yet.`} /></Card>
      ) : (
        <div className="space-y-4">
          {child.attempts.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{a.test.title}</h3>
                    <Badge>{a.test.type === "MOCK" ? "Mock" : "Practice"}</Badge>
                    {a.isRetry && <Badge tone="amber">Retest</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{formatDate(a.createdAt)}</p>
                </div>
                <div className="flex gap-4 text-right">
                  <div><p className="text-[11px] text-slate-500">Score</p><Badge tone={scoreTone(a.percentage)}>{a.percentage}%</Badge></div>
                  <div><p className="text-[11px] text-slate-500">Accuracy</p><p className="text-sm font-semibold text-white">{a.accuracy}%</p></div>
                  {!a.isRetry && a.rank && <div><p className="text-[11px] text-slate-500">Rank</p><p className="text-sm font-semibold text-white">#{a.rank}</p></div>}
                </div>
              </div>
              {(a.weakTopics.length > 0 || a.strongTopics.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {a.strongTopics.map((t) => <Badge key={`s-${t}`} tone="emerald">{t}</Badge>)}
                  {a.weakTopics.map((t) => <Badge key={`w-${t}`} tone="rose">{t}</Badge>)}
                </div>
              )}
              {a.mentorComment && (
                <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                  <p className="text-[11px] font-semibold text-blue-300">Mentor feedback</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{a.mentorComment}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

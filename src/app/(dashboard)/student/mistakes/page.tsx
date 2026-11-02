"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, FileSpreadsheet, MinusCircle, XCircle } from "lucide-react";
import { Badge, Btn, Card, EmptyState, ErrorState, PageHeader, PageLoader, Tabs, formatDate, inputClass } from "@/components/ui/kit";
import { useApi } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

interface Mistake {
  answerId: string;
  attemptId: string;
  testTitle: string;
  date: string;
  outcome: "incorrect" | "unattempted";
  selected: string | null;
  question: {
    id: string; text: string; options: { id: string; text: string }[]; correctOption: string; explanation: string | null;
    subject: string; chapter: string | null; topic: string; questionType: string;
  };
}

type GroupBy = "test" | "chapter";
type Kind = "all" | "incorrect" | "unattempted";

export default function MistakesPage() {
  const { data, error, loading, reload } = useApi<{ mistakes: Mistake[] }>("/api/student/insights");
  const [groupBy, setGroupBy] = useState<GroupBy>("test");
  const [kind, setKind] = useState<Kind>("all");
  const [subject, setSubject] = useState("ALL");
  const [open, setOpen] = useState<string | null>(null);

  const mistakes = data?.mistakes ?? [];
  const subjects = useMemo(() => Array.from(new Set(mistakes.map((m) => m.question.subject))), [mistakes]);
  const filtered = mistakes.filter((m) => (kind === "all" || m.outcome === kind) && (subject === "ALL" || m.question.subject === subject));

  const groups = useMemo(() => {
    const map = new Map<string, Mistake[]>();
    for (const m of filtered) {
      const key = groupBy === "test" ? `${m.testTitle} · ${formatDate(m.date)}` : m.question.chapter || m.question.topic || "General";
      map.set(key, [...(map.get(key) ?? []), m]);
    }
    return [...map.entries()];
  }, [filtered, groupBy]);

  if (loading) return <PageLoader label="Loading your mistake notebook…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Mistakes" description="Every question you got wrong or skipped, with the correct answer and explanation." />

      {mistakes.length === 0 ? (
        <Card><EmptyState icon={FileSpreadsheet} title="No mistakes recorded" description="Questions you answer incorrectly or skip in submitted tests will be collected here for revision." action={<Link href="/student/mocks"><Btn>Take a test</Btn></Link>} /></Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Tabs<GroupBy> value={groupBy} onChange={setGroupBy} items={[{ id: "test", label: "By test" }, { id: "chapter", label: "By chapter" }]} />
            <Tabs<Kind>
              value={kind}
              onChange={setKind}
              items={[
                { id: "all", label: "All", count: mistakes.length },
                { id: "incorrect", label: "Wrong", count: mistakes.filter((m) => m.outcome === "incorrect").length },
                { id: "unattempted", label: "Skipped", count: mistakes.filter((m) => m.outcome === "unattempted").length },
              ]}
            />
            {subjects.length > 1 && (
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className={`${inputClass} w-auto`} aria-label="Subject">
                <option value="ALL">All subjects</option>
                {subjects.map((s) => <option key={s}>{s}</option>)}
              </select>
            )}
          </div>

          <div className="space-y-6">
            {groups.map(([title, items]) => (
              <section key={title} className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-300">{title} <span className="font-normal text-slate-500">({items.length})</span></h2>
                <Card className="divide-y divide-white/[0.05]">
                  {items.map((m) => {
                    const isOpen = open === m.answerId;
                    const correct = new Set(m.question.correctOption.split(",").map((s) => s.trim().toUpperCase()));
                    const picked = new Set((m.selected || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean));
                    return (
                      <div key={m.answerId}>
                        <button onClick={() => setOpen(isOpen ? null : m.answerId)} className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-white/[0.02]" aria-expanded={isOpen}>
                          {m.outcome === "incorrect" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" /> : <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-sm text-slate-200", !isOpen && "line-clamp-2")}>{m.question.text}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              <Badge>{m.question.subject}</Badge>
                              <Badge>{m.question.topic}</Badge>
                            </div>
                          </div>
                          <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition", isOpen && "rotate-180")} />
                        </button>
                        {isOpen && (
                          <div className="space-y-3 px-5 pb-5 pl-12">
                            {m.question.questionType === "NUMERICAL" ? (
                              <p className="text-sm text-slate-300">
                                Your answer: <span className="font-mono text-rose-300">{m.selected || "—"}</span> · Correct: <span className="font-mono text-emerald-300">{m.question.correctOption}</span>
                              </p>
                            ) : (
                              <div className="grid gap-2 md:grid-cols-2">
                                {m.question.options.map((o) => {
                                  const isC = correct.has(o.id.toUpperCase());
                                  const isP = picked.has(o.id.toUpperCase());
                                  return (
                                    <div key={o.id} className={cn("flex gap-2 rounded-lg border p-2.5 text-sm", isC ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : isP ? "border-rose-500/40 bg-rose-500/10 text-rose-200" : "border-white/[0.06] text-slate-400")}>
                                      <span className="font-semibold">{o.id}.</span><span className="flex-1">{o.text}</span>
                                      {isC && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {m.question.explanation && <p className="rounded-lg bg-black/20 p-3 text-sm leading-relaxed text-slate-300">{m.question.explanation}</p>}
                            <Link href={`/exam/${m.attemptId}/results`} className="inline-block text-xs font-semibold text-blue-400 hover:text-blue-300">Open full test review →</Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Card>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

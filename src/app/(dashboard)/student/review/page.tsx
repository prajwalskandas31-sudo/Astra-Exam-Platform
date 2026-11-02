"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Brain, CheckCircle2, PartyPopper, Trash2, XCircle } from "lucide-react";
import { Badge, Btn, Card, EmptyState, ErrorState, PageHeader, PageLoader, ProgressBar, StatCard, inputClass } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { ReportQuestionButton } from "@/components/student/ReportQuestion";
import { isAnswerCorrect } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface ReviewCard {
  id: string;
  repetitions: number;
  lapses: number;
  intervalDays: number;
  question: {
    id: string;
    text: string;
    options: { id: string; text: string }[];
    correctOption: string;
    explanation: string | null;
    subject: string;
    topic: string;
    difficulty: string;
    questionType: string;
  };
}

interface ReviewData {
  items: ReviewCard[];
  stats: { due: number; total: number; mastered: number; nextDueAt: string | null };
}

const GRADES = [
  { id: "AGAIN", label: "Again", hint: "10 min", key: "1", variant: "danger" as const },
  { id: "HARD", label: "Hard", hint: "shorter gap", key: "2", variant: "secondary" as const },
  { id: "GOOD", label: "Good", hint: "normal gap", key: "3", variant: "primary" as const },
  { id: "EASY", label: "Easy", hint: "longer gap", key: "4", variant: "success" as const },
];

export default function ReviewPage() {
  const { data, error, loading, reload } = useApi<ReviewData>("/api/reviews");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [numeric, setNumeric] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);

  const card = data?.items[index];
  const isMulti = card?.question.questionType === "MULTIPLE_CHOICE";
  const isNumeric = card?.question.questionType === "NUMERICAL";
  const answer = isNumeric ? numeric : [...selected].sort().join(",");
  const correct = card && revealed && answer ? isAnswerCorrect(card.question.questionType, card.question.correctOption, answer) : null;

  const next = () => {
    setIndex((i) => i + 1);
    setSelected([]);
    setNumeric("");
    setRevealed(false);
  };

  const grade = async (g: string) => {
    if (!card || busy) return;
    setBusy(true);
    try {
      await apiFetch("/api/reviews", { method: "POST", json: { itemId: card.id, grade: g } });
      setDone((d) => d + 1);
      next();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!card) return;
    try {
      await apiFetch("/api/reviews", { method: "POST", json: { itemId: card.id, remove: true } });
      toast.success("Removed from your review queue");
      next();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove");
    }
  };

  // Keyboard: Space/Enter reveals, 1–4 grades once revealed
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed) {
        const g = GRADES.find((x) => x.key === e.key);
        if (g) grade(g.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (loading) return <PageLoader label="Loading your review queue…" />;
  if (error || !data) return <ErrorState message={error || "Failed to load"} onRetry={reload} />;

  const total = data.items.length;
  const finished = index >= total;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Daily Review"
        description="Questions you got wrong come back on a spaced-repetition schedule until you know them cold."
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Due now" value={Math.max(0, data.stats.due - done)} icon={Brain} tone="violet" />
        <StatCard label="In queue" value={data.stats.total} tone="blue" />
        <StatCard label="Mastered" value={data.stats.mastered} hint="Interval ≥ 3 weeks" tone="emerald" />
      </div>

      {data.stats.total === 0 ? (
        <Card>
          <EmptyState
            icon={Brain}
            title="Your review queue is empty"
            description="Whenever you answer a question incorrectly in a test, it's added here and scheduled for review."
            action={<Link href="/student/mocks"><Btn>Take a test</Btn></Link>}
          />
        </Card>
      ) : finished ? (
        <Card>
          <EmptyState
            icon={PartyPopper}
            title={done > 0 ? `All done — ${done} card${done === 1 ? "" : "s"} reviewed` : "Nothing due right now"}
            description={data.stats.nextDueAt ? `Next card is due ${new Date(data.stats.nextDueAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}.` : "Come back tomorrow for your next batch."}
            action={
              <div className="flex gap-2">
                <Link href="/student/practice"><Btn variant="secondary">Build a custom quiz</Btn></Link>
                {done > 0 && <Btn onClick={() => { setIndex(0); setDone(0); reload(); }}>Check for more</Btn>}
              </div>
            }
          />
        </Card>
      ) : card && (
        <>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Card {index + 1} of {total}</span>
              <span>{card.lapses > 0 ? `Missed ${card.lapses}× in review` : card.repetitions > 0 ? `Reviewed ${card.repetitions}×` : "New"}</span>
            </div>
            <ProgressBar value={(index / total) * 100} tone="blue" />
          </div>

          <Card className="space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">{card.question.subject}</Badge>
              <span className="text-xs text-slate-500">{card.question.topic} · {card.question.difficulty.toLowerCase()}</span>
              <ReportQuestionButton questionId={card.question.id} className="ml-auto" />
              <button onClick={remove} className=" inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-500 hover:bg-white/5 hover:text-rose-300" title="I know this — stop showing it">
                <Trash2 className="h-3 w-3" />Remove
              </button>
            </div>

            <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-100">{card.question.text}</p>

            {isNumeric ? (
              <input
                value={numeric}
                onChange={(e) => setNumeric(e.target.value)}
                disabled={revealed}
                placeholder="Your answer"
                className={cn(inputClass, "max-w-xs font-mono")}
                onKeyDown={(e) => e.key === "Enter" && setRevealed(true)}
              />
            ) : (
              <div className="grid gap-2">
                {card.question.options.map((opt) => {
                  const id = opt.id.toUpperCase();
                  const isSel = selected.includes(id);
                  const isCor = card.question.correctOption.split(",").map((s) => s.trim().toUpperCase()).includes(id);
                  return (
                    <button
                      key={opt.id}
                      disabled={revealed}
                      onClick={() => setSelected(isMulti ? (isSel ? selected.filter((x) => x !== id) : [...selected, id]) : [id])}
                      className={cn(
                        "flex gap-3 rounded-xl border p-3 text-left text-sm transition",
                        !revealed && (isSel ? "border-blue-500/60 bg-blue-500/10 text-white" : "border-white/[0.08] text-slate-300 hover:border-white/20"),
                        revealed && isCor && "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
                        revealed && !isCor && isSel && "border-rose-500/50 bg-rose-500/10 text-rose-200",
                        revealed && !isCor && !isSel && "border-white/[0.06] text-slate-500"
                      )}
                    >
                      <span className="font-bold">{opt.id}.</span>
                      <span className="flex-1">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {revealed && (
              <div className="space-y-3">
                {correct !== null && (
                  <p className={cn("flex items-center gap-1.5 text-sm font-semibold", correct ? "text-emerald-400" : "text-rose-400")}>
                    {correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {correct ? "Correct" : "Not quite"}
                  </p>
                )}
                {isNumeric && <p className="text-sm text-slate-300">Correct answer: <span className="font-mono text-emerald-300">{card.question.correctOption}</span></p>}
                {card.question.explanation && (
                  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                    <p className="mb-1 text-xs font-semibold text-slate-400">Explanation</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{card.question.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {!revealed ? (
            <div className="flex justify-center">
              <Btn size="lg" onClick={() => setRevealed(true)}>{answer ? "Check answer" : "Show answer"} <span className="text-xs opacity-60">(Space)</span></Btn>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-xs text-slate-400">How well did you know it?</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {GRADES.map((g) => (
                  <Btn key={g.id} variant={g.variant} disabled={busy} onClick={() => grade(g.id)} className="h-auto flex-col gap-0 py-2">
                    <span>{g.label}</span>
                    <span className="text-[10px] font-normal opacity-70">{g.hint} · {g.key}</span>
                  </Btn>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

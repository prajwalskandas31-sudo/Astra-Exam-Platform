"use client";

import { useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, CheckCircle2, Clock, MinusCircle, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge, Card, EmptyState, ErrorState, PageLoader, Tabs, formatDuration } from "@/components/ui/kit";
import { useApi } from "@/lib/fetcher";
import { ReportQuestionButton } from "@/components/student/ReportQuestion";
import { cn } from "@/lib/utils";

interface ReviewAttempt {
  id: string;
  score: number | null;
  maxScore: number;
  createdAt: string;
  mentorComment: string | null;
  answers: { questionId: string; selectedOpt: string | null; isCorrect: boolean | null; timeSpent: number }[];
  test: {
    title: string;
    questions: {
      section: string | null;
      question: {
        id: string;
        text: string;
        options: string;
        correctOption: string;
        explanation: string | null;
        subject: string;
        topic: string;
        questionType: string;
        marks: number;
        negativeMarks: number;
      };
    }[];
  };
}

type Filter = "all" | "incorrect" | "unanswered" | "correct";

function parseOptions(raw: string): { id: string; text: string }[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

type PeerStats = Record<string, { pctCorrect: number; avgTime: number }>;

/**
 * Question-by-question review of a submitted attempt, with explanations and bookmarking.
 * `allowBookmarks` marks the student's own view, which also gets the "report a problem" flag.
 */
export function TestReview({ attemptId, onClose, embedded = false, allowBookmarks = true, peerStats }: {
  attemptId: string;
  onClose?: () => void;
  embedded?: boolean;
  allowBookmarks?: boolean;
  peerStats?: PeerStats;
}) {
  const { data: attempt, error, loading, reload } = useApi<ReviewAttempt>(`/api/attempts/${attemptId}`);
  const { data: bookmarkIds, setData: setBookmarkIds } = useApi<string[]>(allowBookmarks ? "/api/bookmarks?ids=1" : null);
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    if (!attempt) return [];
    const byQ = new Map(attempt.answers.map((a) => [a.questionId, a]));
    return attempt.test.questions.map((tq, i) => {
      const ans = byQ.get(tq.question.id);
      const outcome: Exclude<Filter, "all"> = !ans?.selectedOpt ? "unanswered" : ans.isCorrect ? "correct" : "incorrect";
      return { number: i + 1, q: tq.question, section: tq.section, ans, outcome };
    });
  }, [attempt]);

  const toggleBookmark = async (questionId: string) => {
    const set = new Set(bookmarkIds ?? []);
    const was = set.has(questionId);
    if (was) set.delete(questionId);
    else set.add(questionId);
    setBookmarkIds([...set]);
    const res = await fetch("/api/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId }) });
    if (!res.ok) {
      toast.error("Couldn't update bookmark");
      setBookmarkIds(bookmarkIds);
    } else {
      toast.success(was ? "Removed from bookmarks" : "Added to bookmarks");
    }
  };

  if (loading) return <PageLoader label="Loading review…" />;
  if (error || !attempt) return <ErrorState message={error || "Failed to load attempt details."} onRetry={reload} />;

  const counts = {
    all: rows.length,
    incorrect: rows.filter((r) => r.outcome === "incorrect").length,
    unanswered: rows.filter((r) => r.outcome === "unanswered").length,
    correct: rows.filter((r) => r.outcome === "correct").length,
  };
  const visible = filter === "all" ? rows : rows.filter((r) => r.outcome === filter);
  const bookmarked = new Set(bookmarkIds ?? []);

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-5">
          <div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">{attempt.test.title}</h2>
            <p className="mt-1 text-sm text-slate-400">
              Score {attempt.score ?? 0} / {attempt.maxScore} · {new Date(attempt.createdAt).toLocaleDateString()}
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5">
              Close review
            </button>
          )}
        </div>
      )}

      {attempt.mentorComment && (
        <Card className="border-blue-500/20 bg-blue-500/5 p-5">
          <p className="mb-1 text-xs font-semibold text-blue-300">Mentor feedback</p>
          <p className="whitespace-pre-wrap text-sm text-slate-200">{attempt.mentorComment}</p>
        </Card>
      )}

      <Tabs<Filter>
        value={filter}
        onChange={setFilter}
        items={[
          { id: "all", label: "All", count: counts.all },
          { id: "incorrect", label: "Incorrect", count: counts.incorrect },
          { id: "unanswered", label: "Skipped", count: counts.unanswered },
          { id: "correct", label: "Correct", count: counts.correct },
        ]}
      />

      {visible.length === 0 ? (
        <Card><EmptyState icon={CheckCircle2} title="Nothing here" description="No questions match this filter." /></Card>
      ) : (
        <div className="space-y-4">
          {visible.map(({ number, q, section, ans, outcome }) => {
            const options = parseOptions(q.options);
            const correctSet = new Set(q.correctOption.split(",").map((s) => s.trim().toUpperCase()));
            const selectedSet = new Set((ans?.selectedOpt || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean));
            const Icon = outcome === "correct" ? CheckCircle2 : outcome === "incorrect" ? XCircle : MinusCircle;

            return (
              <Card
                key={q.id}
                className={cn(
                  "p-5",
                  outcome === "correct" && "border-emerald-500/20",
                  outcome === "incorrect" && "border-rose-500/20"
                )}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Q{number}</span>
                    <Badge tone={outcome === "correct" ? "emerald" : outcome === "incorrect" ? "rose" : "slate"}>
                      <Icon className="h-3 w-3" />
                      {outcome === "correct" ? `Correct · +${q.marks}` : outcome === "incorrect" ? `Incorrect${q.negativeMarks ? ` · −${q.negativeMarks}` : ""}` : "Not answered"}
                    </Badge>
                    <Badge>{section || q.subject}</Badge>
                    <span className="text-[11px] text-slate-500">{q.topic}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {peerStats?.[q.id] && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500" title="Share of students who answered this correctly, and their average time">
                        <Users className="h-3 w-3" />{peerStats[q.id].pctCorrect}% got it · avg {formatDuration(peerStats[q.id].avgTime)}
                      </span>
                    )}
                    {ans && ans.timeSpent > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500" title="Your time"><Clock className="h-3 w-3" />{formatDuration(ans.timeSpent)}</span>
                    )}
                    {allowBookmarks && <ReportQuestionButton questionId={q.id} />}
                    {allowBookmarks && <button onClick={() => toggleBookmark(q.id)} className={cn("rounded-lg p-1", bookmarked.has(q.id) ? "text-amber-400" : "text-slate-500 hover:text-white")} aria-label="Toggle bookmark">
                      {bookmarked.has(q.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    </button>}
                  </div>
                </div>

                <p className="mb-4 whitespace-pre-wrap text-base leading-relaxed text-slate-100">{q.text}</p>

                {q.questionType === "NUMERICAL" ? (
                  <div className="mb-4 grid gap-2 sm:grid-cols-2">
                    <div className={cn("rounded-xl border p-3 text-sm", outcome === "correct" ? "border-emerald-500/40 bg-emerald-500/10" : outcome === "incorrect" ? "border-rose-500/40 bg-rose-500/10" : "border-white/10")}>
                      <p className="text-[11px] text-slate-400">Your answer</p>
                      <p className="font-mono text-white">{ans?.selectedOpt || "—"}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                      <p className="text-[11px] text-slate-400">Correct answer</p>
                      <p className="font-mono text-emerald-300">{q.correctOption}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 grid gap-2 md:grid-cols-2">
                    {options.map((opt) => {
                      const id = opt.id.toUpperCase();
                      const isSel = selectedSet.has(id);
                      const isCor = correctSet.has(id);
                      return (
                        <div
                          key={opt.id}
                          className={cn(
                            "flex gap-3 rounded-xl border p-3 text-sm",
                            isCor && isSel && "border-emerald-500/50 bg-emerald-500/15 text-emerald-200",
                            isCor && !isSel && "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
                            !isCor && isSel && "border-rose-500/50 bg-rose-500/15 text-rose-200",
                            !isCor && !isSel && "border-white/[0.06] text-slate-400"
                          )}
                        >
                          <span className="font-bold">{opt.id}.</span>
                          <span className="flex-1">{opt.text}</span>
                          {isSel && <span className="text-[10px] font-semibold uppercase">You</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.explanation && (
                  <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                    <p className="mb-1 text-xs font-semibold text-slate-400">Explanation</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{q.explanation}</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

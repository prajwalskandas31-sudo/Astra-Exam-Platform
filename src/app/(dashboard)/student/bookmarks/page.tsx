"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bookmark, BookmarkX, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Badge, Card, EmptyState, ErrorState, PageHeader, PageLoader, inputClass } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

interface BookmarkRow {
  id: string;
  note: string | null;
  createdAt: string;
  revealed: boolean;
  question: {
    id: string; text: string; options: { id: string; text: string }[]; correctOption: string | null; explanation: string | null;
    subject: string; chapter: string | null; topic: string; difficulty: string; questionType: string;
  };
}

export default function BookmarksPage() {
  const { data, setData, error, loading, reload } = useApi<BookmarkRow[]>("/api/bookmarks");
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const remove = async (row: BookmarkRow) => {
    setData((data ?? []).filter((b) => b.id !== row.id));
    try {
      await apiFetch("/api/bookmarks", { method: "POST", json: { questionId: row.question.id } });
      toast.success("Bookmark removed");
    } catch {
      toast.error("Couldn't remove bookmark");
      reload();
    }
  };

  const saveNote = async (row: BookmarkRow, note: string) => {
    if ((row.note ?? "") === note) return;
    try {
      await apiFetch("/api/bookmarks", { method: "POST", json: { questionId: row.question.id, note } });
      toast.success("Note saved");
    } catch {
      toast.error("Couldn't save note");
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const rows = (data ?? []).filter((b) => !query || `${b.question.text} ${b.question.topic} ${b.question.subject}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader title="Bookmarks" description="Questions you saved during tests or reviews, with your own notes." />
      {(data ?? []).length === 0 ? (
        <Card><EmptyState icon={Bookmark} title="No bookmarks yet" description="Tap the bookmark icon on any question during a test or review to save it here." /></Card>
      ) : (
        <>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search bookmarks" className={`${inputClass} max-w-sm`} />
          <div className="space-y-4">
            {rows.map((b) => {
              const isShown = shown.has(b.id);
              const correct = new Set((b.question.correctOption || "").split(",").map((s) => s.trim().toUpperCase()));
              return (
                <Card key={b.id} className="p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge>{b.question.subject}</Badge>
                      <Badge>{b.question.topic}</Badge>
                      <Badge tone={b.question.difficulty === "HARD" ? "rose" : b.question.difficulty === "EASY" ? "emerald" : "amber"}>{b.question.difficulty.toLowerCase()}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {b.revealed && (
                        <button
                          onClick={() => setShown((s) => { const n = new Set(s); if (n.has(b.id)) n.delete(b.id); else n.add(b.id); return n; })}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-white/5"
                        >
                          {isShown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{isShown ? "Hide answer" : "Show answer"}
                        </button>
                      )}
                      <button onClick={() => remove(b)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400" aria-label="Remove bookmark">
                        <BookmarkX className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{b.question.text}</p>
                  {b.question.options.length > 0 && (
                    <div className="mb-3 grid gap-2 md:grid-cols-2">
                      {b.question.options.map((o) => (
                        <div key={o.id} className={cn("flex gap-2 rounded-lg border p-2.5 text-sm", isShown && correct.has(o.id.toUpperCase()) ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-white/[0.06] text-slate-400")}>
                          <span className="font-semibold">{o.id}.</span><span className="flex-1">{o.text}</span>
                          {isShown && correct.has(o.id.toUpperCase()) && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                        </div>
                      ))}
                    </div>
                  )}
                  {isShown && b.question.questionType === "NUMERICAL" && <p className="mb-3 text-sm text-emerald-300">Answer: <span className="font-mono">{b.question.correctOption}</span></p>}
                  {isShown && b.question.explanation && <p className="mb-3 rounded-lg bg-black/20 p-3 text-sm text-slate-300">{b.question.explanation}</p>}
                  {!b.revealed && <p className="mb-3 text-xs text-slate-500">The answer unlocks once you&apos;ve submitted a test containing this question.</p>}
                  <textarea
                    defaultValue={b.note ?? ""}
                    onBlur={(e) => saveNote(b, e.target.value)}
                    placeholder="Add a note (saved automatically)"
                    rows={2}
                    className={`${inputClass} text-xs`}
                  />
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

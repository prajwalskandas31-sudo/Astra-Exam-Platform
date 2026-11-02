"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Btn, Card, CardHeader, Field, Spinner, inputClass } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

interface Options {
  totalQuestions: number;
  unseen: number;
  incorrect: number;
  subjects: { name: string; total: number; unseen: number; topics: { name: string; count: number }[] }[];
}

const SOURCES = [
  { id: "ALL", label: "All questions" },
  { id: "UNSEEN", label: "Unseen only" },
  { id: "INCORRECT", label: "Previously missed" },
] as const;

/** Lets a student build a private quiz by subject, topic, difficulty and source. */
export function CustomQuizBuilder() {
  const router = useRouter();
  const { data, loading, error } = useApi<Options>("/api/practice/custom");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("ANY");
  const [source, setSource] = useState<(typeof SOURCES)[number]["id"]>("ALL");
  const [count, setCount] = useState(20);
  const [timed, setTimed] = useState(true);
  const [creating, setCreating] = useState(false);

  // Topics come from the selected subjects (or every subject when none is picked)
  const topicOptions = useMemo(
    () => (data?.subjects ?? []).filter((s) => subjects.length === 0 || subjects.includes(s.name)).flatMap((s) => s.topics),
    [data, subjects]
  );

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const create = async () => {
    setCreating(true);
    try {
      const res = await apiFetch<{ attemptId: string; questionCount: number; available: number }>("/api/practice/custom", {
        method: "POST",
        json: { subjects, topics: topics.filter((t) => topicOptions.some((o) => o.name === t)), difficulty, source, count, timed },
      });
      toast.success(res.questionCount < count ? `Only ${res.questionCount} questions matched — quiz ready` : `Quiz ready with ${res.questionCount} questions`);
      router.push(`/exam/${res.attemptId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't build quiz");
      setCreating(false);
    }
  };

  const chip = (on: boolean) =>
    cn("rounded-lg border px-2.5 py-1 text-xs font-medium transition", on ? "border-blue-500/60 bg-blue-500/15 text-blue-200" : "border-white/10 text-slate-400 hover:text-white");

  return (
    <Card>
      <CardHeader title="Build a custom quiz" description="Pick exactly what to practise from your institute's question bank. Custom quizzes are unranked." icon={Sparkles} />
      {loading ? (
        <div className="flex justify-center p-8"><Spinner /></div>
      ) : error || !data ? (
        <p className="p-5 text-sm text-rose-300">{error || "Couldn't load the question bank"}</p>
      ) : data.totalQuestions === 0 ? (
        <p className="p-5 text-sm text-slate-400">Your institute hasn&apos;t published any questions yet.</p>
      ) : (
        <div className="space-y-5 p-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-300">Subjects <span className="text-slate-500">(none = all)</span></p>
            <div className="flex flex-wrap gap-1.5">
              {data.subjects.map((s) => (
                <button key={s.name} onClick={() => toggle(subjects, setSubjects, s.name)} className={chip(subjects.includes(s.name))}>
                  {s.name} <span className="opacity-60">{s.total}</span>
                </button>
              ))}
            </div>
          </div>

          {topicOptions.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-300">Topics <span className="text-slate-500">(none = all)</span></p>
              <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                {topicOptions.map((t) => (
                  <button key={t.name} onClick={() => toggle(topics, setTopics, t.name)} className={chip(topics.includes(t.name))}>
                    {t.name} <span className="opacity-60">{t.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Questions from">
              <select value={source} onChange={(e) => setSource(e.target.value as typeof source)} className={inputClass}>
                {SOURCES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}{s.id === "UNSEEN" ? ` (${data.unseen})` : s.id === "INCORRECT" ? ` (${data.incorrect})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Difficulty">
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputClass}>
                <option value="ANY">Any</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
              </select>
            </Field>
            <Field label={`Number of questions: ${count}`}>
              <input type="range" min={5} max={100} step={5} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-blue-500" />
            </Field>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="h-4 w-4 accent-blue-500" />
              Timed (uses each question&apos;s recommended time)
            </label>
            <Btn loading={creating} onClick={create}><Sparkles className="h-4 w-4" />Start quiz</Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

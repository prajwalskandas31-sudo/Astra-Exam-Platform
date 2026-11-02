"use client";

import { useMemo, useState } from "react";
import { CloudOff } from "lucide-react";
import { useExamStore } from "@/store/examStore";
import type { SyncState } from "@/hooks/useAutosave";
import { ExamTimer, SyncBadge } from "@/components/exam/ExamChrome";
import { Btn } from "@/components/ui/kit";
import { cn } from "@/lib/utils";

interface OmrExamInterfaceProps {
  testTitle: string;
  syncState: SyncState;
  onRequestSubmit: () => void;
}

const DEFAULT_BUBBLES = ["A", "B", "C", "D"].map((id) => ({ id, text: "" }));

export function OmrExamInterface({ testTitle, syncState, onRequestSubmit }: OmrExamInterfaceProps) {
  const questions = useExamStore((s) => s.questions);
  const answers = useExamStore((s) => s.answers);
  const isOnline = useExamStore((s) => s.isOnline);
  const { selectOption, clearSelection, setTextAnswer } = useExamStore.getState();
  const [activeSection, setActiveSection] = useState<string>("ALL");

  const sections = useMemo(() => Array.from(new Set(questions.map((q) => q.section))), [questions]);
  const visible = activeSection === "ALL" ? questions : questions.filter((q) => q.section === activeSection);
  const answeredCount = Object.values(answers).filter((a) => a.selectedOption).length;

  return (
    <div className="flex h-dvh flex-1 select-none flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-slate-900 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-9 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xs font-black text-white sm:flex">OMR</div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-white sm:text-base">{testTitle}</h1>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-emerald-400">Pen &amp; paper OMR simulation</span>
              <SyncBadge state={syncState} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-[11px] text-slate-400">Bubbles filled</p>
            <p className="text-sm font-bold tabular-nums">{answeredCount} / {questions.length}</p>
          </div>
          <ExamTimer />
        </div>
      </header>

      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-2 text-xs font-medium text-amber-200">
          <CloudOff className="h-4 w-4" /> You&apos;re offline. Your sheet is stored on this device and will sync when you reconnect.
        </div>
      )}

      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-white/[0.06] bg-slate-900/60 px-3 py-2 sm:px-6">
        {["ALL", ...sections].map((sec) => {
          const count = sec === "ALL" ? questions.length : questions.filter((q) => q.section === sec).length;
          return (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={cn("whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold transition", activeSection === sec ? "bg-emerald-600 text-white" : "bg-white/[0.04] text-slate-400 hover:text-white")}
            >
              {sec === "ALL" ? "All sections" : sec} ({count})
            </button>
          );
        })}
      </div>

      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((q) => {
            const number = questions.findIndex((x) => x.id === q.id) + 1;
            const selected = answers[q.id]?.selectedOption;
            const bubbles = q.options.length > 0 ? q.options : DEFAULT_BUBBLES;

            return (
              <div
                key={q.id}
                className={cn("rounded-xl border p-4 transition", selected ? "border-emerald-500/40 bg-emerald-950/20" : "border-white/[0.08] bg-slate-900/50")}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-200">
                    Q{number} <span className="text-xs font-normal text-slate-500">· {q.section}</span>
                  </span>
                  {selected && (
                    <button onClick={() => clearSelection(q.id)} className="text-[11px] font-medium text-rose-400 hover:underline">Clear</button>
                  )}
                </div>
                <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{q.text}</p>
                {q.options.length > 0 && (
                  <ul className="mb-3 space-y-1 text-xs text-slate-400">
                    {q.options.map((o) => (
                      <li key={o.id}><span className="font-semibold text-slate-300">{o.id}.</span> {o.text}</li>
                    ))}
                  </ul>
                )}
                {q.questionType === "NUMERICAL" ? (
                  <input
                    key={q.id}
                    inputMode="decimal"
                    defaultValue={selected ?? ""}
                    onChange={(e) => setTextAnswer(q.id, e.target.value)}
                    placeholder="Write your answer"
                    aria-label={`Answer for question ${number}`}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-emerald-500"
                  />
                ) : (
                  <div className="flex items-center justify-around rounded-lg border border-white/[0.06] bg-black/30 px-2 py-2" role="radiogroup" aria-label={`Question ${number}`}>
                    {bubbles.map((opt) => {
                      const filled = selected === opt.id;
                      return (
                        <button
                          key={opt.id}
                          role="radio"
                          aria-checked={filled}
                          onClick={() => selectOption(q.id, opt.id)}
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition",
                            filled ? "scale-105 border-2 border-white bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/40" : "border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
                          )}
                        >
                          {opt.id}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.06] bg-slate-900 px-4 py-3 sm:px-8">
        <p className="text-xs text-slate-400">
          Answered <strong className="text-emerald-400">{answeredCount}</strong> · Unanswered <strong className="text-slate-200">{questions.length - answeredCount}</strong>
        </p>
        <Btn variant="success" onClick={onRequestSubmit}>Submit OMR sheet</Btn>
      </footer>
    </div>
  );
}

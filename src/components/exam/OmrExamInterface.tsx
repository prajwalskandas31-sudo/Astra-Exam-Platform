"use client";

import { useState } from "react";
import { useExamStore } from "@/store/examStore";
import { Button } from "@/components/ui/button";

interface OmrExamInterfaceProps {
  testTitle: string;
  attemptId: string;
  onFinish: () => void;
}

export function OmrExamInterface({ testTitle, attemptId, onFinish }: OmrExamInterfaceProps) {
  const {
    questions,
    answers,
    selectOption,
    clearSelection,
    timeRemaining,
    submitExam,
    isSubmitting
  } = useExamStore();

  const [activeSection, setActiveSection] = useState<string>("ALL");

  // Get unique sections
  const sections = Array.from(new Set(questions.map((q) => q.section || "General"))).filter(Boolean);

  const filteredQuestions = activeSection === "ALL" 
    ? questions 
    : questions.filter((q) => (q.section || "General") === activeSection);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const answeredCount = Object.values(answers).filter((a) => a.selectedOption !== null).length;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 h-screen overflow-hidden select-none">
      {/* Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-emerald-500/20">
            OMR
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-sm md:text-base leading-none">{testTitle}</h1>
            <span className="text-[11px] text-emerald-400 font-medium">NEET / Pen-Paper OMR Simulation Mode</span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Filled Bubbles</span>
            <div className="text-lg font-bold text-slate-200">
              {answeredCount} / {questions.length}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Time Remaining</span>
            <div className={`text-xl font-mono font-bold leading-none ${timeRemaining < 300 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </header>

      {/* Section Tabs */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-8 py-2.5 flex items-center gap-3 overflow-x-auto shrink-0">
        <button
          onClick={() => setActiveSection("ALL")}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeSection === "ALL" ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
        >
          All Sections ({questions.length})
        </button>
        {sections.map((sec) => {
          const secCount = questions.filter((q) => (q.section || "General") === sec).length;
          return (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeSection === sec ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
              {sec} ({secCount})
            </button>
          );
        })}
      </div>

      {/* Main OMR Bubble Sheet Grid */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <span>📝</span> OMR Bubble Sheet Responses
              </h2>
              <span className="text-xs text-slate-400">Click a bubble (A, B, C, D) to mark your response on the sheet</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuestions.map((q, idx) => {
                const globalIndex = questions.findIndex((gq) => gq.id === q.id);
                const currentAns = answers[q.id];
                const selectedOpt = currentAns?.selectedOption;
                const optionsList = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []);

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-xl border transition-all animate-in fade-in zoom-in-95 duration-500 ${selectedOpt ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600'}`}
                    style={{ animationDelay: `${(idx % 12) * 50}ms`, animationFillMode: 'both' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-slate-300">
                        Q.{globalIndex + 1} <span className="text-xs font-normal text-slate-500">({q.section || 'General'})</span>
                      </span>
                      {selectedOpt && (
                        <button
                          onClick={() => clearSelection(q.id)}
                          className="text-[11px] text-red-400 hover:underline font-medium"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Question snippet */}
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                      {q.text}
                    </p>

                    {/* Bubble Options */}
                    <div className="flex items-center justify-between px-2 py-1.5 bg-black/30 rounded-lg border border-slate-800">
                      {(optionsList.length > 0 ? optionsList : [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }]).map((opt: any) => {
                        const optId = opt.id || opt;
                        const isFilled = selectedOpt === optId;

                        return (
                          <button
                            key={optId}
                            onClick={() => selectOption(q.id, optId)}
                            className={`w-9 h-9 rounded-full font-bold text-sm flex items-center justify-center transition-all ${
                              isFilled
                                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/40 scale-105 border-2 border-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                            }`}
                          >
                            {optId}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-8 shrink-0">
        <div className="text-xs text-slate-400">
          <span>Total Answered: <strong className="text-emerald-400">{answeredCount}</strong></span>
          <span className="mx-2">•</span>
          <span>Unanswered: <strong className="text-slate-300">{questions.length - answeredCount}</strong></span>
        </div>

        <Button
          onClick={submitExam}
          disabled={isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 h-11 shadow-lg shadow-emerald-600/30"
        >
          {isSubmitting ? "Submitting OMR Sheet..." : "Submit OMR Sheet"}
        </Button>
      </footer>
    </div>
  );
}

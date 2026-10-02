"use client";

import { useEffect, useState, use } from "react";
import { useExamStore } from "@/store/examStore";
import { useProctoring } from "@/hooks/useProctoring";
import { useAutosave } from "@/hooks/useAutosave";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import { VirtualCalculator } from "@/components/exam/VirtualCalculator";
import { OmrExamInterface } from "@/components/exam/OmrExamInterface";

export default function ExamPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const { 
    initializeExam, 
    questions, 
    currentQuestionIndex, 
    nextQuestion, 
    prevQuestion,
    answers,
    selectOption,
    markForReview,
    clearSelection,
    goToQuestion,
    timeRemaining,
    decrementTime,
    isOnline,
    submitExam,
    isSubmitting,
    mode,
    examCategory,
    templateConfig,
    activeSection,
    setActiveSection,
    isCalculatorOpen,
    toggleCalculator
  } = useExamStore();
  
  const { enterFullscreen, isFullscreen } = useProctoring();
  const { lastSyncTime } = useAutosave();

  const [hasStarted, setHasStarted] = useState(false);
  const [loadingAttempt, setLoadingAttempt] = useState(true);
  const [testTitle, setTestTitle] = useState("Competitive Mock Exam");
  const [error, setError] = useState<string | null>(null);

  // Fetch real exam data
  useEffect(() => {
    const fetchAttempt = async () => {
      try {
        setLoadingAttempt(true);
        const res = await fetch(`/api/attempts/${attemptId}`);
        if (!res.ok) {
          const text = await res.text();
          setError(text || "Failed to fetch attempt details.");
          return;
        }
        const data = await res.json();
        
        if (!data.test || !data.test.questions || data.test.questions.length === 0) {
          setError("This test has no questions. Please contact an administrator.");
          return;
        }

        setTestTitle(data.test.title);

        const examMode = data.mode || data.test.mode || 'CBT';
        const category = data.test.template?.examCategory || 'GENERAL';
        const rawConfig = data.test.template?.config;
        const parsedConfig = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : (rawConfig || null);

        // Format questions with section and metadata
        const formattedQuestions = data.test.questions.map((tq: any) => ({
          id: tq.question.id,
          text: tq.question.text,
          options: tq.question.options,
          section: tq.section || tq.question.subject || 'General',
          subject: tq.question.subject,
          chapter: tq.question.chapter,
          questionType: tq.question.questionType,
          marks: tq.question.marks || 1,
          negativeMarks: tq.question.negativeMarks || 0,
        }));

        initializeExam(
          attemptId, 
          formattedQuestions, 
          data.timeRemaining || data.test.duration * 60,
          examMode,
          category,
          parsedConfig
        );
        setError(null);
      } catch (err) {
        console.error("Error fetching attempt", err);
        setError("An unexpected error occurred while loading the exam.");
      } finally {
        setLoadingAttempt(false);
      }
    };
    fetchAttempt();
  }, [attemptId, initializeExam]);

  // Timer effect
  useEffect(() => {
    if (!hasStarted || !isOnline || isSubmitting) return;
    const timer = setInterval(() => decrementTime(), 1000);
    return () => clearInterval(timer);
  }, [hasStarted, isOnline, isSubmitting, decrementTime]);

  // Submit effect
  useEffect(() => {
    if (isSubmitting) {
      const submit = async () => {
        try {
          // Final Sync before submission
          await fetch(`/api/attempts/${attemptId}/sync`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              answers,
              timeRemaining,
            }),
          });

          const res = await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST" });
          if (res.ok) {
            window.location.href = `/exam/${attemptId}/results`;
          } else {
            console.error("Failed to submit");
            alert("Failed to submit exam. Please try again or contact support.");
          }
        } catch (err) {
          console.error(err);
        }
      };
      submit();
    }
  }, [isSubmitting, attemptId, answers, timeRemaining]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  if (loadingAttempt) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-white min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-lg font-medium text-slate-300">Loading exam environment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-white min-h-screen p-6">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 p-8 rounded-2xl text-center space-y-6">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-2xl font-bold text-red-400">Unable to Load Exam</h1>
          <p className="text-slate-300 text-sm">{error}</p>
          <Button onClick={() => window.location.href = '/student'} className="w-full bg-white text-slate-900 font-bold">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Pre-Exam Instruction Screen
  if (!hasStarted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 text-white min-h-screen">
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-full border border-blue-500/20 uppercase tracking-wider">
              {mode} Mode • {examCategory} Pattern
            </span>
            <h1 className="text-2xl font-bold text-slate-100">{testTitle}</h1>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-3 text-xs text-slate-300">
            <h3 className="font-bold text-slate-200 text-sm">Exam Guidelines & Rules:</h3>
            <ul className="list-disc pl-5 space-y-1.5 leading-relaxed">
              <li>Ensure you maintain a stable internet connection.</li>
              <li>{mode === 'OMR' ? 'Mark your responses on the interactive OMR grid sheet.' : 'Do not switch browser tabs, exit fullscreen, or minimize the browser.'}</li>
              <li>Questions can be reviewed, marked, or answered in any sequence.</li>
              <li>The exam will automatically submit when the timer reaches 00:00:00.</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-800/40 rounded-lg text-center border border-slate-800">
              <span className="text-xs text-slate-500 font-medium">Total Questions</span>
              <p className="text-lg font-bold text-slate-200">{questions.length}</p>
            </div>
            <div className="p-3 bg-slate-800/40 rounded-lg text-center border border-slate-800">
              <span className="text-xs text-slate-500 font-medium">Duration</span>
              <p className="text-lg font-bold text-slate-200">{Math.floor(timeRemaining / 60)} mins</p>
            </div>
          </div>

          <Button 
            className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-lg shadow-blue-600/30" 
            size="lg"
            onClick={() => {
              if (mode === 'CBT') enterFullscreen();
              setHasStarted(true);
            }}
          >
            I Understand, Start {mode} Exam
          </Button>
        </div>
      </div>
    );
  }

  // Render OMR Interface if exam mode is OMR
  if (mode === 'OMR') {
    return <OmrExamInterface testTitle={testTitle} attemptId={attemptId} onFinish={submitExam} />;
  }

  if (!isOnline) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <div className="bg-slate-900 border border-red-500/30 p-8 rounded-xl max-w-md text-center">
          <h2 className="text-red-400 text-xl font-bold mb-2">Connection Lost</h2>
          <p className="text-slate-300 text-sm">Please wait while we attempt to reconnect. Your exam session is safely saved.</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQ?.id];

  // Get unique sections in test
  const sections = Array.from(new Set(questions.map(q => q.section))).filter(Boolean);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 h-screen overflow-hidden select-none">
      {/* Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6 justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            {(examCategory || "G").substring(0, 1)}
          </div>
          <div>
            <span className="font-bold text-slate-200 text-sm md:text-base leading-none block">{testTitle}</span>
            <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">{examCategory} CBT Mode</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Virtual Calculator Toggle for GATE/Engineering Pattern */}
          {(templateConfig?.virtualCalculatorEnabled || examCategory === 'GATE') && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleCalculator}
              className={`h-9 gap-2 border-slate-700 bg-slate-800 text-xs font-bold ${isCalculatorOpen ? 'bg-blue-600 text-white border-blue-500' : 'text-slate-300 hover:text-white'}`}
            >
              <Calculator className="w-4 h-4" /> Calculator
            </Button>
          )}

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Time Remaining</span>
            <div className={`text-xl font-mono font-bold leading-none ${timeRemaining < 300 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </header>

      {/* Section Navigation Bar */}
      {sections.length > 1 && (
        <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-wider">Sections:</span>
          {sections.map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`px-3.5 py-1 rounded-lg text-xs font-bold transition ${activeSection === sec ? 'bg-blue-600 text-white shadow' : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'}`}
            >
              {sec}
            </button>
          ))}
        </div>
      )}

      {/* Virtual Calculator Window */}
      {isCalculatorOpen && <VirtualCalculator onClose={toggleCalculator} />}

      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: Question Pane */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
          {currentQ && (
            <div className="max-w-3xl mx-auto space-y-8 py-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-full border border-blue-500/20">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
                      {currentQ.section}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    Marks: <span className="text-emerald-400 font-bold">+{currentQ.marks}</span> | <span className="text-red-400 font-bold">-{currentQ.negativeMarks}</span>
                  </div>
                </div>

                <h2 className="text-lg md:text-xl font-medium leading-relaxed text-slate-100">
                  {currentQ.text}
                </h2>
              </div>

              {/* Options */}
              <div className="space-y-3.5">
                {(typeof currentQ.options === 'string' ? JSON.parse(currentQ.options) : currentQ.options).map((opt: any) => {
                  const isSelected = currentAnswer?.selectedOption === opt.id;
                  return (
                    <label 
                      key={opt.id} 
                      className={`group flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600/90 border-blue-400 text-white shadow-lg shadow-blue-600/20' 
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                        isSelected ? 'bg-white text-blue-600 border-white' : 'border-slate-600 text-slate-400 group-hover:border-slate-400'
                      }`}>
                        {opt.id}
                      </div>
                      <input 
                        type="radio" 
                        name={`q-${currentQ.id}`}
                        className="hidden"
                        checked={isSelected}
                        onChange={() => selectOption(currentQ.id, opt.id)}
                      />
                      <span className="text-base font-medium">{opt.text}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Palette */}
        <aside className="w-80 bg-slate-900/60 border-l border-slate-800 flex flex-col shrink-0 backdrop-blur-sm">
          <div className="p-5 border-b border-slate-800 bg-slate-900/40">
            <h3 className="font-bold text-slate-200 text-sm">Question Palette</h3>
            <p className="text-xs text-slate-500 mt-0.5">NTA / Competitive standard legend</p>
          </div>

          <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const status = ans?.status || 'NOT_VISITED';

                let stateClass = "bg-slate-800 border-slate-700 text-slate-400"; // NOT_VISITED
                if (status === "UNANSWERED") stateClass = "bg-red-500/20 border-red-500/50 text-red-400 font-bold";
                if (status === "ANSWERED") stateClass = "bg-emerald-600 border-emerald-400 text-white font-bold shadow-md";
                if (status === "MARKED_FOR_REVIEW") stateClass = "bg-purple-600 border-purple-400 text-white font-bold shadow-md";
                if (status === "ANSWERED_AND_MARKED") stateClass = "bg-indigo-600 border-indigo-400 text-white font-bold ring-2 ring-emerald-400 shadow-md";
                
                return (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(idx)}
                    className={`aspect-square rounded-lg border text-xs flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${stateClass} ${
                      currentQuestionIndex === idx ? 'ring-2 ring-blue-400 border-white font-black scale-105' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="p-5 border-t border-slate-800 bg-slate-900/40 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-800 border border-slate-700 rounded-sm"></div> Not Visited
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500/20 border border-red-500/50 rounded-sm"></div> Unanswered
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-600 border border-emerald-400 rounded-sm"></div> Answered
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-600 border border-purple-400 rounded-sm"></div> Marked for Review
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-600 border border-indigo-400 rounded-sm ring-1 ring-emerald-400"></div> Answered & Marked
            </div>
          </div>
        </aside>
      </main>

      {/* Footer Navigation Bar */}
      <footer className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-8 shrink-0 z-20">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={prevQuestion} 
            disabled={currentQuestionIndex === 0} 
            className="h-10 px-5 border-slate-700 bg-slate-800 text-slate-200 text-xs font-bold"
          >
            Previous
          </Button>
          <Button 
            variant="outline" 
            className={`h-10 px-5 text-xs font-bold transition-all ${
              currentAnswer?.status === 'MARKED_FOR_REVIEW' || currentAnswer?.status === 'ANSWERED_AND_MARKED'
                ? 'bg-purple-600 text-white border-purple-400' 
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`} 
            onClick={() => markForReview(currentQ?.id)}
          >
            Mark for Review
          </Button>
          <Button
            variant="ghost"
            onClick={() => clearSelection(currentQ?.id)}
            disabled={!currentAnswer?.selectedOption}
            className="h-10 px-4 text-xs font-semibold text-slate-400 hover:text-red-400"
          >
            Clear Response
          </Button>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={nextQuestion} 
            disabled={currentQuestionIndex === questions.length - 1}
            className="h-10 px-7 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20"
          >
            Save & Next
          </Button>
          <Button 
            variant="destructive" 
            onClick={submitExam} 
            disabled={isSubmitting}
            className="h-10 px-7 bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/20"
          >
            {isSubmitting ? "Submitting..." : "Submit Exam"}
          </Button>
        </div>
      </footer>
    </div>
  );
}

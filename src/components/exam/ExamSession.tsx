"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Bookmark, BookmarkCheck, Calculator, ChevronLeft, ChevronRight, CloudOff, Flag, Grid3x3,
  Loader2, Maximize, ShieldAlert, AlertTriangle
} from "lucide-react";
import { useExamStore, type AnswerState, type AnswerStatus, type SubmitReason } from "@/store/examStore";
import { useProctoring } from "@/hooks/useProctoring";
import { useAutosave, type SyncState } from "@/hooks/useAutosave";
import { ExamTimer, SyncBadge, formatClock } from "@/components/exam/ExamChrome";
import { VirtualCalculator } from "@/components/exam/VirtualCalculator";
import { OmrExamInterface } from "@/components/exam/OmrExamInterface";
import { Btn, Modal } from "@/components/ui/kit";
import { cn } from "@/lib/utils";

/** What an exam needs once its paper is in the store (see `useExamStore.initializeExam`). */
export interface ExamSessionInfo {
  title: string;
  isRetry: boolean;
  isResume: boolean;
  /** Named paper set ("A", "B"...) when the test uses sets. */
  setCode?: string | null;
  /** Shown on the instructions, e.g. "Lab 2 · Row 3, Seat 4". */
  note?: string | null;
}

export interface ExamSessionProps {
  info: ExamSessionInfo;
  /** Send the final answers. Throw to let the student retry; the answers stay on the device. */
  submit: (body: { reason: SubmitReason | null; answers: AnswerState[] }, onRetry: (attempt: number) => void) => Promise<void>;
  /** Called once the submission has been accepted. */
  onSubmitted: () => void;
  /** Online exams autosave to the server; offline exams persist on the device instead. */
  autosave: boolean;
  bookmarks: boolean;
  /** Extra persistence on every answer change (offline exams journal to the device). */
  onAnswersChange?: () => void;
}

/**
 * The exam itself, after loading: instructions, the CBT or OMR interface, the timer, proctoring
 * and the submit flow. The same component runs online exams and offline (pre-downloaded) ones.
 */
export function ExamSession({ info, submit, onSubmitted, autosave, bookmarks: bookmarksEnabled, onAnswersChange }: ExamSessionProps) {
  const mode = useExamStore((s) => s.mode);
  const questions = useExamStore((s) => s.questions);
  const timeRemaining = useExamStore((s) => s.timeRemaining);
  const isSubmitting = useExamStore((s) => s.isSubmitting);
  const submitReason = useExamStore((s) => s.submitReason);
  const tick = useExamStore((s) => s.tick);
  const submitExam = useExamStore((s) => s.submitExam);
  const cancelSubmit = useExamStore((s) => s.cancelSubmit);
  const examCategory = useExamStore((s) => s.examCategory);
  const attemptId = useExamStore((s) => s.attemptId);

  const [hasStarted, setHasStarted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  const isCbt = mode === "CBT";
  const { enterFullscreen, isFullscreen, maxViolations } = useProctoring(hasStarted && isCbt && !isSubmitting, autosave);
  const { syncState } = useAutosave(hasStarted && autosave);

  useEffect(() => {
    if (!bookmarksEnabled) return;
    let cancelled = false;
    fetch("/api/bookmarks?ids=1")
      .then((r) => (r.ok ? r.json() : []))
      .then((ids: string[]) => !cancelled && setBookmarks(new Set(ids)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bookmarksEnabled]);

  // Offline exams write every change to the device straight away
  useEffect(() => {
    if (!onAnswersChange) return;
    return useExamStore.subscribe((s, prev) => {
      if (s.answers !== prev.answers || s.violations !== prev.violations) onAnswersChange();
    });
  }, [onAnswersChange]);

  // Countdown. Keeps running offline: the server clock does too.
  useEffect(() => {
    if (!hasStarted || isSubmitting) return;
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, isSubmitting, tick]);

  useEffect(() => {
    if (hasStarted && !isSubmitting && timeRemaining <= 0 && questions.length > 0) {
      toast.info("Time's up! Submitting your exam…");
      submitExam("TIMEOUT");
    }
  }, [hasStarted, isSubmitting, timeRemaining, questions.length, submitExam]);

  // Final sync + submit, exactly once per submit request
  const submitting = useRef(false);
  useEffect(() => {
    if (!isSubmitting || submitting.current) return;
    submitting.current = true;
    setConfirmOpen(false);
    (async () => {
      // The final answers travel with the submit itself, so nothing depends on the last autosave
      const { answers } = useExamStore.getState();
      try {
        localStorage.setItem(`backup_${attemptId}`, JSON.stringify({ answers, savedAt: Date.now() }));
      } catch {}
      try {
        await submit({ reason: submitReason, answers: Object.values(answers) }, (n) =>
          toast.loading(`The server is busy — retrying your submission (${n})… Your answers are safe.`, { id: "submit-retry" })
        );
        toast.dismiss("submit-retry");
        try {
          localStorage.removeItem(`backup_${attemptId}`);
        } catch {}
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        onSubmitted();
      } catch (e) {
        toast.dismiss("submit-retry");
        // At 00:00 the timer re-triggers submit as soon as this one is cancelled; pause first so
        // a persistent failure can't turn into a tight request loop
        if (submitReason === "TIMEOUT") await new Promise((r) => setTimeout(r, 10_000));
        submitting.current = false;
        cancelSubmit();
        toast.error(`${e instanceof Error ? e.message : "Submit failed"}. Your answers are saved on this device — please try again.`);
      }
    })();
  }, [isSubmitting, submitReason, attemptId, submit, onSubmitted, cancelSubmit]);

  const toggleBookmark = useCallback(async (questionId: string) => {
    if (!bookmarksEnabled) return;
    const was = bookmarks.has(questionId);
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (was) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      if (!res.ok) throw new Error();
      toast.success(was ? "Bookmark removed" : "Question bookmarked for later review");
    } catch {
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (was) next.add(questionId);
        else next.delete(questionId);
        return next;
      });
      toast.error("Couldn't update bookmark");
    }
  }, [bookmarks, bookmarksEnabled]);

  if (!hasStarted) {
    return (
      <InstructionScreen
        title={info.title}
        mode={mode}
        examCategory={examCategory}
        questionCount={questions.length}
        timeRemaining={timeRemaining}
        maxViolations={maxViolations}
        isRetry={info.isRetry}
        isResume={info.isResume}
        setCode={info.setCode ?? null}
        note={info.note ?? null}
        offline={!autosave}
        onStart={() => {
          if (isCbt) enterFullscreen();
          setHasStarted(true);
        }}
      />
    );
  }

  const submitDialog = (
    <SubmitDialog open={confirmOpen && !isSubmitting} onClose={() => setConfirmOpen(false)} onConfirm={() => submitExam("MANUAL")} />
  );

  if (isSubmitting) {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center bg-slate-950 text-white">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-500" />
          <p className="text-base font-semibold">Submitting your answers…</p>
          <p className="text-sm text-slate-400">
            {submitReason === "TIMEOUT" ? "Time is up." : submitReason === "VIOLATIONS" ? "Auto-submitted after proctoring violations." : "Please don't close this window."}
          </p>
        </div>
      </div>
    );
  }

  const title = info.setCode ? `${info.title} · Set ${info.setCode}` : info.title;
  const effectiveSync: SyncState = autosave ? syncState : "offline";

  if (mode === "OMR") {
    return (
      <>
        <OmrExamInterface testTitle={title} syncState={effectiveSync} onRequestSubmit={() => setConfirmOpen(true)} />
        {submitDialog}
      </>
    );
  }

  return (
    <>
      <CbtInterface
        testTitle={title}
        syncState={effectiveSync}
        isFullscreen={isFullscreen}
        onEnterFullscreen={enterFullscreen}
        bookmarks={bookmarks}
        bookmarksEnabled={bookmarksEnabled}
        onToggleBookmark={toggleBookmark}
        onRequestSubmit={() => setConfirmOpen(true)}
        maxViolations={maxViolations}
        offlineExam={!autosave}
      />
      {submitDialog}
    </>
  );
}

export function ExamLoading({ label = "Preparing your exam environment…" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-slate-950 text-white">
      <div className="space-y-4 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-500" />
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export function ExamError({ title = "Unable to load exam", message, action }: { title?: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-rose-400" />
        <h1 className="text-xl font-bold text-rose-300">{title}</h1>
        <p className="text-sm text-slate-300">{message}</p>
        {action}
      </div>
    </div>
  );
}

function InstructionScreen({ title, mode, examCategory, questionCount, timeRemaining, maxViolations, isRetry, isResume, setCode, note, offline, onStart }: {
  title: string;
  mode: "CBT" | "OMR";
  examCategory: string | null;
  questionCount: number;
  timeRemaining: number;
  maxViolations: number;
  isRetry: boolean;
  isResume: boolean;
  setCode: string | null;
  note: string | null;
  offline: boolean;
  onStart: () => void;
}) {
  const questions = useExamStore((s) => s.questions);
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const hasNegative = questions.some((q) => q.negativeMarks > 0);

  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-slate-950 p-4 text-white sm:p-6">
      <div className="w-full max-w-2xl space-y-6 rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl sm:p-8">
        <div className="space-y-3 text-center">
          <div className="flex flex-wrap justify-center gap-2">
            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
              {mode} mode · {examCategory || "General"} pattern
            </span>
            {isRetry && <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">Targeted retest</span>}
            {isResume && <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">Resuming saved progress</span>}
            {setCode && <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300" data-testid="paper-set">Paper set {setCode}</span>}
            {offline && <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">Offline exam</span>}
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {note && <p className="text-sm text-slate-400">{note}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Questions", value: questionCount },
            { label: isResume ? "Time left" : "Duration", value: `${Math.ceil(timeRemaining / 60)} min` },
            { label: "Max marks", value: totalMarks },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
              <p className="text-[11px] text-slate-400">{s.label}</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-slate-300">
          <h3 className="font-semibold text-white">Before you begin</h3>
          <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">
            {offline ? (
              <li>This exam runs without the internet. Every answer is saved on this computer as you go, and your answer sheet uploads automatically once you submit and the computer is back online.</li>
            ) : (
              <li>Your answers are saved automatically every few seconds — you can safely resume if your connection drops.</li>
            )}
            <li>The timer keeps running once started. The exam submits itself at 00:00:00.</li>
            {hasNegative && <li>Some questions carry <span className="font-semibold text-rose-300">negative marking</span> — leave a question blank if you&apos;re unsure.</li>}
            {mode === "CBT" ? (
              <li>The exam runs in fullscreen. Switching tabs, leaving fullscreen or losing focus counts as a violation — {maxViolations} violations auto-submit the exam.</li>
            ) : (
              <li>Fill one bubble per question on the OMR sheet. You can change or clear a bubble until you submit.</li>
            )}
            {mode === "CBT" && <li>Shortcuts: <kbd className="rounded bg-white/10 px-1">←</kbd>/<kbd className="rounded bg-white/10 px-1">→</kbd> navigate, <kbd className="rounded bg-white/10 px-1">A</kbd>–<kbd className="rounded bg-white/10 px-1">E</kbd> choose an option, <kbd className="rounded bg-white/10 px-1">M</kbd> mark for review.</li>}
          </ul>
        </div>

        <Btn size="lg" className="w-full" onClick={onStart}>
          {isResume ? "Resume exam" : `I understand — start ${mode} exam`}
        </Btn>
      </div>
    </div>
  );
}

const PALETTE_STYLES: Record<AnswerStatus, string> = {
  NOT_VISITED: "bg-slate-800 border-slate-700 text-slate-400",
  UNANSWERED: "bg-rose-500/15 border-rose-500/50 text-rose-300",
  ANSWERED: "bg-emerald-600 border-emerald-400 text-white",
  MARKED_FOR_REVIEW: "bg-violet-600 border-violet-400 text-white",
  ANSWERED_AND_MARKED: "bg-violet-600 border-emerald-400 text-white ring-2 ring-emerald-400/70",
};

const LEGEND: { status: AnswerStatus; label: string }[] = [
  { status: "ANSWERED", label: "Answered" },
  { status: "UNANSWERED", label: "Not answered" },
  { status: "NOT_VISITED", label: "Not visited" },
  { status: "MARKED_FOR_REVIEW", label: "Marked for review" },
  { status: "ANSWERED_AND_MARKED", label: "Answered & marked" },
];

function useStatusCounts() {
  const answers = useExamStore((s) => s.answers);
  return useMemo(() => {
    const counts: Record<AnswerStatus, number> = { NOT_VISITED: 0, UNANSWERED: 0, ANSWERED: 0, MARKED_FOR_REVIEW: 0, ANSWERED_AND_MARKED: 0 };
    for (const a of Object.values(answers)) counts[a.status]++;
    return counts;
  }, [answers]);
}

function QuestionPalette({ onPick }: { onPick?: () => void }) {
  const questions = useExamStore((s) => s.questions);
  const answers = useExamStore((s) => s.answers);
  const current = useExamStore((s) => s.currentQuestionIndex);
  const goToQuestion = useExamStore((s) => s.goToQuestion);
  const counts = useStatusCounts();

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-white/[0.06] p-4 text-[11px] text-slate-400">
        {LEGEND.map((l) => (
          <div key={l.status} className="flex items-center gap-2">
            <span className={cn("flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold", PALETTE_STYLES[l.status])}>{counts[l.status]}</span>
            {l.label}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => {
                goToQuestion(idx);
                onPick?.();
              }}
              aria-label={`Question ${idx + 1}`}
              aria-current={current === idx ? "true" : undefined}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg border text-xs font-bold transition hover:scale-105",
                PALETTE_STYLES[answers[q.id]?.status ?? "NOT_VISITED"],
                current === idx && "outline outline-2 outline-offset-2 outline-blue-400"
              )}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CbtInterface({ testTitle, syncState, isFullscreen, onEnterFullscreen, bookmarks, bookmarksEnabled, onToggleBookmark, onRequestSubmit, maxViolations, offlineExam }: {
  testTitle: string;
  syncState: SyncState;
  isFullscreen: boolean;
  onEnterFullscreen: () => void;
  bookmarks: Set<string>;
  bookmarksEnabled: boolean;
  onToggleBookmark: (id: string) => void;
  onRequestSubmit: () => void;
  maxViolations: number;
  offlineExam: boolean;
}) {
  const questions = useExamStore((s) => s.questions);
  const answers = useExamStore((s) => s.answers);
  const index = useExamStore((s) => s.currentQuestionIndex);
  const activeSection = useExamStore((s) => s.activeSection);
  const examCategory = useExamStore((s) => s.examCategory);
  const templateConfig = useExamStore((s) => s.templateConfig);
  const isOnline = useExamStore((s) => s.isOnline);
  const violations = useExamStore((s) => s.violations);
  const isCalculatorOpen = useExamStore((s) => s.isCalculatorOpen);
  const { selectOption, toggleMultiOption, setTextAnswer, markForReview, clearSelection, nextQuestion, prevQuestion, setActiveSection, toggleCalculator } = useExamStore.getState();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const q = questions[index];
  const answer = q ? answers[q.id] : undefined;
  const sections = useMemo(() => Array.from(new Set(questions.map((x) => x.section))), [questions]);
  const showCalculator = templateConfig?.virtualCalculatorEnabled || examCategory === "GATE";
  const isMarkedNow = answer?.status === "MARKED_FOR_REVIEW" || answer?.status === "ANSWERED_AND_MARKED";

  // Keyboard shortcuts (ignored while typing in an input)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      if (e.key === "ArrowRight") nextQuestion();
      else if (e.key === "ArrowLeft") prevQuestion();
      else if (key === "M") markForReview(q.id);
      else if (q.questionType !== "NUMERICAL" && q.options.some((o) => (o.label ?? o.id).toUpperCase() === key)) {
        const opt = q.options.find((o) => (o.label ?? o.id).toUpperCase() === key)!;
        if (q.questionType === "MULTIPLE_CHOICE") toggleMultiOption(q.id, opt.id);
        else selectOption(q.id, opt.id);
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, nextQuestion, prevQuestion, markForReview, selectOption, toggleMultiOption]);

  if (!q) return null;
  const selectedSet = new Set((answer?.selectedOption || "").split(",").filter(Boolean));
  const isLast = index === questions.length - 1;

  return (
    <div className="flex h-dvh flex-1 select-none flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-slate-900 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-bold text-white sm:flex">
            {(examCategory || "G").charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white sm:text-base">{testTitle}</p>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-blue-400">{examCategory} · CBT</span>
              <SyncBadge state={syncState} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {violations > 0 && (
            <span className="hidden items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-300 sm:inline-flex" title="Proctoring violations">
              <ShieldAlert className="h-3.5 w-3.5" /> {violations}/{maxViolations}
            </span>
          )}
          {showCalculator && (
            <button
              onClick={toggleCalculator}
              className={cn("rounded-lg border p-2 transition", isCalculatorOpen ? "border-blue-500 bg-blue-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5")}
              aria-label="Calculator"
            >
              <Calculator className="h-4 w-4" />
            </button>
          )}
          <ExamTimer />
          <button onClick={() => setPaletteOpen(true)} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5 lg:hidden" aria-label="Question palette">
            <Grid3x3 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {!isOnline && !offlineExam && (
        <div className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-2 text-xs font-medium text-amber-200">
          <CloudOff className="h-4 w-4" /> You&apos;re offline. Keep answering — your progress is stored on this device and will sync when you reconnect.
        </div>
      )}
      {!isFullscreen && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
          <span>The exam must run in fullscreen.</span>
          <button onClick={onEnterFullscreen} className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 px-2 py-1 font-semibold hover:bg-rose-500/30">
            <Maximize className="h-3.5 w-3.5" /> Return to fullscreen
          </button>
        </div>
      )}

      {sections.length > 1 && (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-white/[0.06] bg-slate-900/60 px-3 py-2 sm:px-6">
          {sections.map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={cn("whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold transition", activeSection === sec ? "bg-blue-600 text-white" : "bg-white/[0.04] text-slate-400 hover:text-white")}
            >
              {sec}
            </button>
          ))}
        </div>
      )}

      {isCalculatorOpen && <VirtualCalculator onClose={toggleCalculator} />}

      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                  Question {index + 1} of {questions.length}
                </span>
                <span className="rounded-md bg-white/[0.05] px-2 py-1 text-xs text-slate-400">{q.section}</span>
                {q.questionType === "MULTIPLE_CHOICE" && <span className="rounded-md bg-violet-500/10 px-2 py-1 text-xs text-violet-300">Select all that apply</span>}
                {q.questionType === "NUMERICAL" && <span className="rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-300">Numerical answer</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  <span className="font-semibold text-emerald-400">+{q.marks}</span>
                  {q.negativeMarks > 0 && <span className="font-semibold text-rose-400"> / −{q.negativeMarks}</span>}
                </span>
                {bookmarksEnabled && <button
                  onClick={() => onToggleBookmark(q.id)}
                  className={cn("rounded-lg p-1.5 transition", bookmarks.has(q.id) ? "text-amber-400" : "text-slate-500 hover:text-slate-200")}
                  aria-label={bookmarks.has(q.id) ? "Remove bookmark" : "Bookmark question"}
                  title="Bookmark for later review"
                >
                  {bookmarks.has(q.id) ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                </button>}
              </div>
            </div>

            <h2 className="whitespace-pre-wrap text-lg font-medium leading-relaxed text-slate-100 sm:text-xl">{q.text}</h2>

            {q.questionType === "NUMERICAL" ? (
              <div className="space-y-2">
                <label htmlFor={`num-${q.id}`} className="text-xs font-medium text-slate-400">Your answer</label>
                <input
                  id={`num-${q.id}`}
                  key={q.id}
                  inputMode="decimal"
                  autoComplete="off"
                  defaultValue={answer?.selectedOption ?? ""}
                  onChange={(e) => setTextAnswer(q.id, e.target.value.replace(/[^0-9.+\-eE/]/g, ""))}
                  placeholder="Type a number, e.g. -2 or 3.14"
                  className="w-full max-w-xs rounded-xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-lg text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            ) : (
              <div className="space-y-3" role={q.questionType === "MULTIPLE_CHOICE" ? "group" : "radiogroup"}>
                {q.options.map((opt) => {
                  const isSelected = selectedSet.has(opt.id);
                  const multi = q.questionType === "MULTIPLE_CHOICE";
                  return (
                    <button
                      key={opt.id}
                      role={multi ? "checkbox" : "radio"}
                      aria-checked={isSelected}
                      onClick={() => (multi ? toggleMultiOption(q.id, opt.id) : selectOption(q.id, opt.id))}
                      className={cn(
                        "group flex w-full items-center gap-4 rounded-xl border p-4 text-left transition",
                        isSelected ? "border-blue-400 bg-blue-600/90 text-white shadow-lg shadow-blue-600/20" : "border-white/[0.08] bg-slate-900/60 text-slate-300 hover:border-white/20 hover:bg-slate-800"
                      )}
                    >
                      <span className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center border text-xs font-bold",
                        multi ? "rounded-md" : "rounded-full",
                        isSelected ? "border-white bg-white text-blue-600" : "border-slate-600 text-slate-400 group-hover:border-slate-400"
                      )}>
                        {opt.label ?? opt.id}
                      </span>
                      <span className="text-base">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="hidden w-80 shrink-0 flex-col border-l border-white/[0.06] bg-slate-900/60 lg:flex">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Question palette</h3>
          </div>
          <QuestionPalette />
          <div className="border-t border-white/[0.06] p-4">
            <Btn variant="danger" className="w-full" onClick={onRequestSubmit}>Submit exam</Btn>
          </div>
        </aside>
      </main>

      <footer className="z-20 flex shrink-0 items-center justify-between gap-2 border-t border-white/[0.06] bg-slate-900 px-3 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Btn variant="secondary" size="sm" onClick={prevQuestion} disabled={index === 0} aria-label="Previous question">
            <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Previous</span>
          </Btn>
          <Btn
            variant="secondary"
            size="sm"
            onClick={() => markForReview(q.id)}
            className={cn(isMarkedNow && "border-violet-400 bg-violet-600 text-white hover:bg-violet-500")}
          >
            <Flag className="h-4 w-4" /> <span className="hidden sm:inline">{isMarkedNow ? "Unmark" : "Mark for review"}</span>
          </Btn>
          <Btn variant="ghost" size="sm" onClick={() => clearSelection(q.id)} disabled={!answer?.selectedOption} className="hidden sm:inline-flex">
            Clear
          </Btn>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="danger" size="sm" onClick={onRequestSubmit} className="lg:hidden">Submit</Btn>
          {isLast ? (
            <Btn size="sm" onClick={onRequestSubmit} className="hidden lg:inline-flex">Review & submit</Btn>
          ) : (
            <Btn size="sm" onClick={nextQuestion}>
              <span className="hidden sm:inline">Save &amp; next</span><span className="sm:hidden">Next</span> <ChevronRight className="h-4 w-4" />
            </Btn>
          )}
        </div>
      </footer>

      <Modal open={paletteOpen} onClose={() => setPaletteOpen(false)} title="Question palette">
        <div className="-mx-5 -my-4 h-[60vh]">
          <QuestionPalette onPick={() => setPaletteOpen(false)} />
        </div>
      </Modal>
    </div>
  );
}

function SubmitDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  const counts = useStatusCounts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const answered = counts.ANSWERED + counts.ANSWERED_AND_MARKED;
  const unanswered = total - answered;
  const timeRemaining = useExamStore((s) => s.timeRemaining);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Submit your exam?"
      description={`You still have ${formatClock(timeRemaining)} remaining. You can't change answers after submitting.`}
      size="sm"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Keep working</Btn>
          <Btn variant="danger" onClick={onConfirm}>Submit now</Btn>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-emerald-500/10 p-3">
          <p className="text-[11px] text-emerald-300">Answered</p>
          <p className="text-2xl font-bold text-white">{answered}<span className="text-sm text-slate-400"> / {total}</span></p>
        </div>
        <div className="rounded-xl bg-rose-500/10 p-3">
          <p className="text-[11px] text-rose-300">Not answered</p>
          <p className="text-2xl font-bold text-white">{unanswered}</p>
        </div>
        <div className="rounded-xl bg-violet-500/10 p-3">
          <p className="text-[11px] text-violet-300">Marked for review</p>
          <p className="text-2xl font-bold text-white">{counts.MARKED_FOR_REVIEW + counts.ANSWERED_AND_MARKED}</p>
        </div>
        <div className="rounded-xl bg-white/[0.04] p-3">
          <p className="text-[11px] text-slate-400">Not visited</p>
          <p className="text-2xl font-bold text-white">{counts.NOT_VISITED}</p>
        </div>
      </div>
      {counts.ANSWERED_AND_MARKED > 0 && (
        <p className="mt-3 text-xs text-slate-400">Answers marked for review will still be evaluated.</p>
      )}
    </Modal>
  );
}

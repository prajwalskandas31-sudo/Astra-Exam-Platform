"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useExamStore, type AnswerState, type AnswerStatus, type ExamTemplateConfig } from "@/store/examStore";
import { ExamError, ExamLoading, ExamSession, type ExamSessionInfo, type ExamSessionProps } from "@/components/exam/ExamSession";
import { toExamQuestions, type PaperQuestion } from "@/lib/examPaperClient";
import { Btn } from "@/components/ui/kit";

interface AttemptResponse {
  status: string;
  mode: "CBT" | "OMR";
  isRetry: boolean;
  setCode: string | null;
  timeRemaining: number;
  violationCount: number;
  answers: { questionId: string; selectedOpt: string | null; status: string; timeSpent: number }[];
  test: {
    title: string;
    duration: number;
    mode: "CBT" | "OMR";
    template: { examCategory: string; config: string } | null;
    questions: PaperQuestion[];
  };
}

const SUBMIT_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000, 15000, 15000, 15000];

/**
 * POST the submission, retrying network errors, 5xx, 408 and 429 with exponential backoff and jitter
 * (honouring Retry-After), so a busy server at the end of a large exam drains instead of being
 * hammered. Submitting twice is safe: the server returns the already-graded attempt.
 */
async function submitWithRetry(url: string, body: unknown, onRetry: (attempt: number) => void): Promise<void> {
  const payload = JSON.stringify(body);
  for (let i = 0; ; i++) {
    let retryable = true;
    let message = "Submit failed";
    let retryAfterMs = 0;
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
      if (res.ok) return;
      message = (await res.json().catch(() => null))?.error || message;
      retryable = res.status >= 500 || res.status === 408 || res.status === 429;
      retryAfterMs = Number(res.headers.get("Retry-After")) * 1000 || 0;
    } catch {
      message = "Network error";
    }
    if (!retryable || i >= SUBMIT_RETRY_DELAYS_MS.length) throw new Error(message);
    onRetry(i + 1);
    const base = Math.max(SUBMIT_RETRY_DELAYS_MS[i], retryAfterMs);
    await new Promise((r) => setTimeout(r, base * (0.5 + Math.random())));
  }
}

export default function ExamPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const router = useRouter();
  const initializeExam = useExamStore((s) => s.initializeExam);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<ExamSessionInfo | null>(null);

  // Load the attempt and hydrate any saved progress
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/attempts/${attemptId}`);
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) {
          setError(data?.error || "We couldn't load this exam.");
          return;
        }
        const attempt = data as AttemptResponse;
        if (attempt.status === "COMPLETED" || attempt.status === "AUTO_SUBMITTED") {
          router.replace(`/exam/${attemptId}/results`);
          return;
        }
        if (!attempt.test.questions.length) {
          setError("This test has no questions yet. Please contact your institute.");
          return;
        }

        const saved: Record<string, Partial<AnswerState>> = {};
        for (const a of attempt.answers) {
          saved[a.questionId] = { selectedOption: a.selectedOpt, status: a.status as AnswerStatus, timeSpent: a.timeSpent };
        }
        // Merge newer local selections that may not have reached the server before a crash
        try {
          const backup = JSON.parse(localStorage.getItem(`backup_${attemptId}`) || "null");
          for (const [qid, ans] of Object.entries((backup?.answers ?? {}) as Record<string, AnswerState>)) {
            if (ans?.selectedOption && !saved[qid]?.selectedOption) saved[qid] = { ...saved[qid], ...ans };
          }
        } catch {
          // ignore corrupt backup
        }

        let config: ExamTemplateConfig | null = null;
        try {
          config = attempt.test.template?.config ? JSON.parse(attempt.test.template.config) : null;
        } catch {
          config = null;
        }

        if (cancelled) return;
        setInfo({
          title: attempt.test.title,
          isRetry: attempt.isRetry,
          isResume: attempt.answers.some((a) => a.selectedOpt) || attempt.timeRemaining < attempt.test.duration * 60 - 30,
          setCode: attempt.setCode,
        });
        initializeExam({
          attemptId,
          questions: toExamQuestions(attempt.test.questions),
          timeRemaining: attempt.timeRemaining,
          mode: attempt.mode || attempt.test.mode || "CBT",
          examCategory: attempt.test.template?.examCategory || "GENERAL",
          templateConfig: config,
          savedAnswers: saved,
          violations: attempt.violationCount,
        });
      } catch {
        if (!cancelled) setError("An unexpected error occurred while loading the exam.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId, initializeExam, router]);

  const submit = useCallback<ExamSessionProps["submit"]>(
    (body, onRetry) => submitWithRetry(`/api/attempts/${attemptId}/submit`, body, onRetry),
    [attemptId]
  );
  const onSubmitted = useCallback(() => router.replace(`/exam/${attemptId}/results`), [attemptId, router]);

  if (loading) return <ExamLoading />;
  if (error || !info) {
    return (
      <ExamError
        message={error || "We couldn't load this exam."}
        action={<Btn variant="secondary" className="w-full" onClick={() => router.push("/student")}>Back to dashboard</Btn>}
      />
    );
  }
  return <ExamSession info={info} submit={submit} onSubmitted={onSubmitted} autosave bookmarks />;
}

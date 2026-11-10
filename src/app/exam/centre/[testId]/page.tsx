"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, CloudOff, Download, HardDriveDownload, KeyRound, Loader2, MonitorCheck, RefreshCw, UploadCloud } from "lucide-react";
import { useExamStore, type AnswerState, type ExamTemplateConfig } from "@/store/examStore";
import { ExamError, ExamLoading, ExamSession, type ExamSessionProps } from "@/components/exam/ExamSession";
import { Btn } from "@/components/ui/kit";
import { applyLayout, buildLayout } from "@/lib/paperLayout";
import { decryptPaper, normalizeStartCode, type EncryptedPaper } from "@/lib/paperCrypto";
import { toExamQuestions, type PaperQuestion } from "@/lib/examPaperClient";
import { deviceDel, deviceGet, deviceId, deviceSet } from "@/lib/deviceStore";

interface Lobby {
  test: { id: string; title: string; duration: number; mode: "CBT" | "OMR"; scheduledStart: string | null; scheduledEnd: string | null; offline: boolean; ready: boolean };
  student: { name: string; studentCode: string | null };
  seat: { label: string } | null;
  setCode: string | null;
  paperSeed: string | null;
  attempt: { id: string; status: string } | null;
  sheet: { status: string; attemptId: string | null } | null;
  checkpoint: { startedAt: number; answers: AnswerState[]; violations: number } | null;
  paperVersion: string | null;
  paper: { data: EncryptedPaper; ticket: string; version: string } | null;
}

interface DecryptedPaper {
  id: string;
  title: string;
  duration: number;
  mode: "CBT" | "OMR";
  shuffleMode: string;
  shuffleOptions: boolean;
  template: { examCategory: string; config: string } | null;
  questions: (PaperQuestion & { questionId: string })[];
}

interface Sheet {
  ticket: string;
  startedAt: number;
  submittedAt: number;
  reason: string | null;
  violations: number;
  deviceId: string;
  answers: AnswerState[];
}

/** Everything this device keeps for one centre exam (IndexedDB). */
interface DeviceRecord {
  lobby: Omit<Lobby, "paper" | "checkpoint">;
  paper: { data: EncryptedPaper; ticket: string; version: string } | null;
  running?: { startedAt: number; code: string; answers: Record<string, AnswerState>; violations: number };
  outbox?: { sheet: Sheet; uploaded: boolean; attemptId?: string | null };
}

const FINISHED = ["COMPLETED", "AUTO_SUBMITTED"];
const CHECKPOINT_MS = 120_000;
const jitter = (ms: number) => ms * (0.75 + Math.random() * 0.5);
const recordKey = (testId: string) => `centre:${testId}`;

/**
 * Install the exam-centre service worker and hand it this page and its scripts to cache.
 * `onReady` fires once they are cached, i.e. a reload with no internet will still work.
 */
function registerOfflineWorker(onReady: (ok: boolean) => void) {
  if (!("serviceWorker" in navigator)) return onReady(false);
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "precached") onReady(!!e.data.ok);
  });
  navigator.serviceWorker
    .register("/exam-sw.js", { scope: "/exam/centre/" })
    .then(() => navigator.serviceWorker.ready)
    .then((reg) => {
      const assets = performance.getEntriesByType("resource").map((e) => e.name).filter((u) => u.includes("/_next/static/"));
      const scripts = Array.from(document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src], link[rel=stylesheet]")).map((el) => ("src" in el && el.src) || (el as HTMLLinkElement).href);
      reg.active?.postMessage({ type: "precache", urls: [location.pathname, ...new Set([...assets, ...scripts])] });
    })
    .catch(() => {});
}

async function upload(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/**
 * Exam-centre lobby. Shows the student their seat and set, takes the invigilator's start code
 * and starts the exam. For offline-enabled tests the encrypted paper is downloaded here in
 * advance, and the exam then runs entirely on this device: answers are kept in IndexedDB,
 * checkpoints go to the server whenever there is internet, and the final answer sheet uploads
 * (with automatic retries, or as a file the invigilator collects) after submitting.
 */
export default function CentreLobbyPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = use(params);
  const router = useRouter();
  const initializeExam = useExamStore((s) => s.initializeExam);

  const [record, setRecord] = useState<DeviceRecord | null>(null);
  const [checkpoint, setCheckpoint] = useState<Lobby["checkpoint"]>(null);
  const [phase, setPhase] = useState<"loading" | "lobby" | "running" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [offlineReady, setOfflineReady] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [starting, setStarting] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<ExamSessionProps["info"] | null>(null);
  // Latest record for callbacks; every write goes through save(), which updates it first
  const recordRef = useRef<DeviceRecord | null>(null);
  useEffect(() => {
    recordRef.current = record;
  }, [record]);

  const save = useCallback(async (next: DeviceRecord) => {
    recordRef.current = next;
    setRecord(next);
    try {
      await deviceSet(recordKey(testId), next);
    } catch {
      toast.error("This browser can't store the exam (private mode?). Ask your invigilator.");
    }
  }, [testId]);

  // ---- running an offline exam ----
  const runOffline = useCallback(async (rec: DeviceRecord, startCode: string, resumeFrom?: Lobby["checkpoint"]) => {
    if (!rec.paper) throw new Error("The paper isn't downloaded on this computer");
    const paper = await decryptPaper<DecryptedPaper>(rec.paper.data, startCode);
    const running = rec.running ?? {
      startedAt: resumeFrom?.startedAt ?? Date.now(),
      code: normalizeStartCode(startCode),
      answers: Object.fromEntries((resumeFrom?.answers ?? []).map((a) => [a.questionId, a])),
      violations: resumeFrom?.violations ?? 0,
    };
    const layout = rec.lobby.paperSeed ? buildLayout(paper.questions, rec.lobby.paperSeed, paper) : null;
    const questions = toExamQuestions(applyLayout(paper.questions, layout));
    let config: ExamTemplateConfig | null = null;
    try {
      config = paper.template?.config ? JSON.parse(paper.template.config) : null;
    } catch {}
    const elapsed = Math.floor((Date.now() - running.startedAt) / 1000);

    initializeExam({
      attemptId: `offline-${testId}`,
      questions,
      timeRemaining: Math.max(0, paper.duration * 60 - elapsed),
      mode: paper.mode,
      examCategory: paper.template?.examCategory || "GENERAL",
      templateConfig: config,
      savedAnswers: running.answers,
      violations: running.violations,
    });
    setSessionInfo({
      title: paper.title,
      isRetry: false,
      isResume: Object.values(running.answers).some((a) => a.selectedOption) || elapsed > 30,
      setCode: rec.lobby.setCode,
      note: [rec.lobby.student.studentCode && `Student ID ${rec.lobby.student.studentCode}`, rec.lobby.seat?.label].filter(Boolean).join(" · ") || null,
    });
    await save({ ...rec, running });
    setPhase("running");
  }, [initializeExam, save, testId]);

  // ---- load: device record first (works offline), then the server ----
  useEffect(() => {
    let cancelled = false;
    setOnline(navigator.onLine);
    (async () => {
      let rec = (await deviceGet<DeviceRecord>(recordKey(testId)).catch(() => undefined)) ?? null;
      let lobby: Lobby | null = null;
      try {
        const res = await fetch(`/api/offline/${testId}`);
        const data = await res.json().catch(() => null);
        if (res.ok) lobby = data;
        else if (!rec) {
          if (data?.error && res.status !== 404) throw new Error(data.error);
          // Not a centre exam (or not available): fall back to the normal exam flow
          router.replace("/student");
          return;
        }
      } catch (e) {
        if (!rec) {
          if (!cancelled) {
            setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "You're offline and this exam isn't downloaded on this computer yet.");
            setPhase("error");
          }
          return;
        }
      }

      if (lobby) {
        const { paper, checkpoint: cp, ...rest } = lobby;
        // Already graded online or from an earlier upload: straight to the result
        if (lobby.attempt && FINISHED.includes(lobby.attempt.status) && !rec?.outbox) {
          router.replace(`/exam/${lobby.attempt.id}/results`);
          return;
        }
        if (!cancelled) setCheckpoint(cp);
        let devicePaper = rec?.paper ?? null;
        if (lobby.test.offline && lobby.paperVersion && devicePaper?.version !== lobby.paperVersion && !rec?.running) {
          // (Re)download the encrypted paper now, while there is internet
          const withPaper = await fetch(`/api/offline/${testId}?paper=1`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
          devicePaper = withPaper?.paper ?? devicePaper;
        }
        rec = { ...(rec ?? {}), lobby: rest, paper: devicePaper };
        await deviceSet(recordKey(testId), rec).catch(() => {});
        if (lobby.test.offline) {
          registerOfflineWorker((ok) => !cancelled && setOfflineReady(ok));
        }
      }
      if (cancelled || !rec) return;
      setRecord(rec);
      recordRef.current = rec;

      if (rec.outbox) setPhase("done");
      else if (rec.running) {
        try {
          await runOffline(rec, rec.running.code);
        } catch {
          setPhase("lobby");
        }
      } else setPhase("lobby");
    })().catch((e) => {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : "Couldn't open the exam");
        setPhase("error");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [testId, router, runOffline]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // ---- start ----
  const start = async () => {
    const rec = recordRef.current;
    if (!rec || !code.trim()) return;
    setStarting(true);
    try {
      if (rec.lobby.test.offline && rec.paper) {
        try {
          await runOffline(rec, code, checkpoint);
        } catch {
          toast.error("That start code isn't right. Check it with your invigilator.");
        }
        return;
      }
      // Online centre exam: the server checks the code and creates the attempt
      const res = await upload("/api/attempts/start", { testId, startCode: code, deviceId: deviceId() });
      if (res.ok && res.data?.attemptId) {
        router.push(`/exam/${res.data.attemptId}`);
        return;
      }
      toast.error(res.status === 0 ? "No internet connection. This exam needs to be online to start." : res.data?.error || "Couldn't start the exam");
    } finally {
      setStarting(false);
    }
  };

  // ---- persistence + checkpoints while running ----
  // Every change reaches the device within 250 ms of the first unsaved one (a throttle, not a
  // debounce: fast clicking must never postpone saving), and immediately when the page hides
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = null;
    const rec = recordRef.current;
    if (!rec?.running || rec.outbox) return;
    const { answers, violations } = useExamStore.getState();
    save({ ...rec, running: { ...rec.running, answers, violations } });
  }, [save]);
  const persist = useCallback(() => {
    if (!persistTimer.current) persistTimer.current = setTimeout(flush, 250);
  }, [flush]);
  useEffect(() => {
    if (phase !== "running") return;
    const onHide = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [phase, flush]);

  const buildSheet = useCallback((reason: string | null, answers?: AnswerState[]): Sheet | null => {
    const rec = recordRef.current;
    if (!rec?.running || !rec.paper) return null;
    const state = useExamStore.getState();
    return {
      ticket: rec.paper.ticket,
      startedAt: rec.running.startedAt,
      submittedAt: Date.now(),
      reason,
      violations: state.violations,
      deviceId: deviceId(),
      answers: answers ?? Object.values(state.answers),
    };
  }, []);

  useEffect(() => {
    if (phase !== "running") return;
    let timer: ReturnType<typeof setTimeout>;
    const send = async () => {
      const sheet = buildSheet(null);
      if (sheet && navigator.onLine) await upload("/api/offline/checkpoint", { ...sheet, submittedAt: undefined });
      timer = setTimeout(send, jitter(CHECKPOINT_MS));
    };
    timer = setTimeout(send, jitter(5_000));
    return () => clearTimeout(timer);
  }, [phase, buildSheet]);

  // ---- submit: saved on the device first, then uploaded ----
  const trySend = useCallback(async () => {
    const rec = recordRef.current;
    if (!rec?.outbox || rec.outbox.uploaded) return rec?.outbox?.uploaded ?? false;
    const res = await upload("/api/offline/submissions", rec.outbox.sheet);
    if (res.ok) {
      await save({ ...rec, outbox: { ...rec.outbox, uploaded: true } });
      return true;
    }
    if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
      toast.error(res.data?.error || "The server rejected this answer sheet. Download it and give it to your invigilator.");
    }
    return false;
  }, [save]);

  const submit = useCallback<ExamSessionProps["submit"]>(async (body) => {
    const rec = recordRef.current;
    const sheet = buildSheet(body.reason, body.answers);
    if (!rec || !sheet) throw new Error("Couldn't save the answer sheet on this computer");
    // The submission is complete once it is on this device; uploading can happen later
    await save({ ...rec, running: rec.running, outbox: { sheet, uploaded: false } });
    await trySend();
  }, [buildSheet, save, trySend]);

  const onSubmitted = useCallback(() => setPhase("done"), []);

  // Keep retrying the upload while waiting; check for the graded result afterwards
  useEffect(() => {
    if (phase !== "done") return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const rec = recordRef.current;
      if (!rec?.outbox) return;
      if (!rec.outbox.uploaded) {
        if (navigator.onLine) await trySend();
      } else if (!rec.outbox.attemptId && navigator.onLine) {
        const lobby: Lobby | null = await fetch(`/api/offline/${testId}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        const attemptId = lobby?.sheet?.status === "DONE" ? lobby.sheet.attemptId : lobby?.attempt && FINISHED.includes(lobby.attempt.status) ? lobby.attempt.id : null;
        if (attemptId) await save({ ...rec, outbox: { ...rec.outbox, attemptId } });
      }
      if (!stopped && !recordRef.current?.outbox?.attemptId) timer = setTimeout(tick, jitter(recordRef.current?.outbox?.uploaded ? 10_000 : 20_000));
    };
    tick();
    const onOnline = () => tick();
    window.addEventListener("online", onOnline);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
    };
  }, [phase, testId, trySend, save]);

  const downloadSheet = () => {
    const rec = recordRef.current;
    if (!rec?.outbox) return;
    const blob = new Blob([JSON.stringify(rec.outbox.sheet)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `answer-sheet-${rec.lobby.student.studentCode || rec.lobby.student.name.replace(/\s+/g, "-")}-${testId.slice(-6)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const finish = async () => {
    await deviceDel(recordKey(testId)).catch(() => {});
    const id = recordRef.current?.outbox?.attemptId;
    router.replace(id ? `/exam/${id}/results` : "/student");
  };

  // ---- screens ----
  if (phase === "loading") return <ExamLoading label="Opening the exam centre…" />;
  if (phase === "error" || !record) {
    return <ExamError title="Can't open this exam" message={error || "Something went wrong."} action={<Btn variant="secondary" className="w-full" onClick={() => router.push("/student")}>Back to dashboard</Btn>} />;
  }
  if (phase === "running" && sessionInfo) {
    return <ExamSession info={sessionInfo} submit={submit} onSubmitted={onSubmitted} autosave={false} bookmarks={false} onAnswersChange={persist} />;
  }

  const { lobby } = record;
  const outbox = record.outbox;

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-slate-950 p-4 text-white sm:p-6">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl sm:p-8">
        <div className="space-y-2 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
            <MonitorCheck className="h-3.5 w-3.5" /> Exam centre{lobby.test.offline ? " · works offline" : ""}
          </span>
          <h1 className="text-2xl font-bold">{lobby.test.title}</h1>
          <p className="text-sm text-slate-400">{lobby.test.duration} minutes</p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <dt className="text-[11px] text-slate-400">Student</dt>
            <dd className="font-semibold">{lobby.student.name}</dd>
            {lobby.student.studentCode && <dd className="font-mono text-xs text-slate-300" data-testid="lobby-student-id">ID {lobby.student.studentCode}</dd>}
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <dt className="text-[11px] text-slate-400">Seat{lobby.setCode ? " & set" : ""}</dt>
            <dd className="font-semibold">{lobby.seat?.label ?? "Any free seat"}</dd>
            {lobby.setCode && <dd className="text-xs text-violet-300" data-testid="lobby-set">Paper set {lobby.setCode}</dd>}
          </div>
        </dl>

        {phase === "done" && outbox ? (
          <div className="space-y-4 text-center" data-testid="offline-done">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="text-lg font-semibold">Exam submitted</p>
            {outbox.attemptId ? (
              <p className="text-sm text-slate-300">Your answers have been graded.</p>
            ) : outbox.uploaded ? (
              <p className="flex items-center justify-center gap-2 text-sm text-slate-300"><UploadCloud className="h-4 w-4 text-emerald-400" />Answer sheet received by the server. Your result will appear shortly.</p>
            ) : (
              <p className="flex items-center justify-center gap-2 text-sm text-amber-200" data-testid="upload-pending">
                {online ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudOff className="h-4 w-4" />}
                Your answers are safely saved on this computer and will upload automatically {online ? "in a moment" : "when it's back online"}.
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              {!outbox.uploaded && <Btn variant="secondary" onClick={() => trySend().then((ok) => toast[ok ? "success" : "error"](ok ? "Uploaded" : "Still can't reach the server"))}><RefreshCw className="h-4 w-4" />Try upload now</Btn>}
              <Btn variant="secondary" onClick={downloadSheet}><Download className="h-4 w-4" />Download answer file</Btn>
              {(outbox.attemptId || outbox.uploaded) && <Btn onClick={finish}>{outbox.attemptId ? "View result" : "Done"}</Btn>}
            </div>
            {!outbox.uploaded && <p className="text-xs text-slate-500">If this computer can&apos;t get online, download the answer file and hand it to your invigilator. Please don&apos;t clear this browser&apos;s data.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {lobby.test.offline && (
              <p className={`flex items-center gap-2 rounded-xl p-3 text-sm ${record.paper ? "bg-emerald-500/10 text-emerald-200" : "bg-amber-500/10 text-amber-200"}`} data-testid="paper-status">
                <HardDriveDownload className="h-4 w-4 shrink-0" />
                {!record.paper
                  ? "The paper hasn't downloaded yet — stay connected for a moment."
                  : offlineReady
                    ? "Paper downloaded — this computer is ready to work offline. You can start even if the internet goes down."
                    : offlineReady === false
                      ? "Paper downloaded. This browser couldn't save the exam page for offline use, so don't reload it during the exam."
                      : "Paper downloaded. Finishing offline setup — stay connected a few more seconds…"}
              </p>
            )}
            {checkpoint && !record.running && (
              <p className="rounded-xl bg-blue-500/10 p-3 text-sm text-blue-200">You started this exam on another computer. Enter the start code to carry on from your last saved answers.</p>
            )}
            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-300"><KeyRound className="h-4 w-4" />Start code (announced by your invigilator)</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && start()}
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. 7KQ2MX9P"
                aria-label="Start code"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </label>
            <Btn size="lg" className="w-full" loading={starting} disabled={!code.trim() || (lobby.test.offline && !record.paper)} onClick={start}>
              Start exam
            </Btn>
            {!online && !lobby.test.offline && <p className="text-center text-xs text-amber-300">You&apos;re offline. This exam needs internet to start.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

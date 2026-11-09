"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useExamStore, type AnswerState } from "@/store/examStore";

export type SyncState = "idle" | "saving" | "saved" | "offline" | "error";

const SYNC_INTERVAL_MS = 15000;
/** ±25% random spread so a whole batch that started together doesn't save in lock-step. */
const jitter = (ms: number) => ms * (0.75 + Math.random() * 0.5);

const fingerprint = (a: AnswerState) => `${a.selectedOption ?? ""}|${a.status}|${a.timeSpent}`;

/**
 * Periodically saves answers to the server, with a localStorage backup for offline periods.
 * Only answers that changed since the last successful save are sent, so each request carries
 * a handful of rows instead of the whole paper.
 */
export function useAutosave(enabled: boolean) {
  const attemptId = useExamStore((s) => s.attemptId);
  const setOnlineStatus = useExamStore((s) => s.setOnlineStatus);
  const setTimeRemaining = useExamStore((s) => s.setTimeRemaining);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);
  /** What the server is known to hold, per question. Empty at first, so the first save sends everything. */
  const confirmed = useRef<Map<string, string>>(new Map());
  const closed = useRef(false);

  const runSync = useCallback(async (): Promise<boolean> => {
    const { answers, timeRemaining, attemptId: id } = useExamStore.getState();
    if (!id || closed.current) return false;

    try {
      localStorage.setItem(`backup_${id}`, JSON.stringify({ answers, timeRemaining, savedAt: Date.now() }));
    } catch {
      // storage full or unavailable; the server copy is the source of truth
    }

    if (!navigator.onLine) {
      setSyncState("offline");
      return false;
    }

    const changed = Object.values(answers).filter((a) => confirmed.current.get(a.questionId) !== fingerprint(a));
    setSyncState("saving");
    try {
      const body = JSON.stringify({ answers: changed, timeRemaining });
      const res = await fetch(`/api/attempts/${id}/sync`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        // Lets the save finish if the tab is closing; browsers cap keepalive bodies at 64 KB
        keepalive: body.length < 60_000,
      });
      if (res.status === 409) {
        // Submitted elsewhere or time is up: stop autosaving; the submit flow takes over
        closed.current = true;
        setSyncState("saved");
        return false;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      for (const a of changed) confirmed.current.set(a.questionId, fingerprint(a));
      // Server clock wins if it is lower (e.g. the tab was asleep)
      if (typeof data.timeRemaining === "number" && data.timeRemaining < useExamStore.getState().timeRemaining - 2) {
        setTimeRemaining(data.timeRemaining);
      }
      setSyncState("saved");
      setLastSyncTime(Date.now());
      return true;
    } catch {
      setSyncState("error");
      return false;
    }
  }, [setTimeRemaining]);

  /** Save now. If a save is already running, wait for it and then save whatever changed since. */
  const sync = useCallback(async (): Promise<boolean> => {
    while (inFlight.current) await inFlight.current.catch(() => false);
    const p = runSync();
    inFlight.current = p;
    try {
      return await p;
    } finally {
      if (inFlight.current === p) inFlight.current = null;
    }
  }, [runSync]);

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      sync();
    };
    const handleOffline = () => {
      setOnlineStatus(false);
      setSyncState("offline");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnlineStatus, sync]);

  useEffect(() => {
    if (!attemptId || !enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const schedule = () => {
      timer = setTimeout(async () => {
        await sync();
        if (!stopped) schedule();
      }, jitter(SYNC_INTERVAL_MS));
    };
    schedule();
    // Best-effort save when the page is being closed or hidden
    const onHide = () => {
      if (document.visibilityState === "hidden") sync();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [attemptId, enabled, sync]);

  return { sync, syncState, lastSyncTime };
}

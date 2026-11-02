"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useExamStore } from "@/store/examStore";

export type SyncState = "idle" | "saving" | "saved" | "offline" | "error";

const SYNC_INTERVAL_MS = 15000;

/** Periodically saves answers to the server, with a localStorage backup for offline periods. */
export function useAutosave(enabled: boolean) {
  const attemptId = useExamStore((s) => s.attemptId);
  const setOnlineStatus = useExamStore((s) => s.setOnlineStatus);
  const setTimeRemaining = useExamStore((s) => s.setTimeRemaining);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const inFlight = useRef(false);

  const sync = useCallback(async (): Promise<boolean> => {
    const { answers, timeRemaining, attemptId: id } = useExamStore.getState();
    if (!id) return false;

    try {
      localStorage.setItem(`backup_${id}`, JSON.stringify({ answers, timeRemaining, savedAt: Date.now() }));
    } catch {
      // storage full or unavailable; the server copy is the source of truth
    }

    if (!navigator.onLine) {
      setSyncState("offline");
      return false;
    }
    if (inFlight.current) return false;
    inFlight.current = true;
    setSyncState("saving");
    try {
      const res = await fetch(`/api/attempts/${id}/sync`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, timeRemaining }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
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
    } finally {
      inFlight.current = false;
    }
  }, [setTimeRemaining]);

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
    const interval = setInterval(sync, SYNC_INTERVAL_MS);
    // Best-effort save when the page is being closed or hidden
    const onHide = () => {
      if (document.visibilityState === "hidden") sync();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [attemptId, enabled, sync]);

  return { sync, syncState, lastSyncTime };
}

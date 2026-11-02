"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useExamStore } from "@/store/examStore";
import { toast } from "sonner";

// A single tab switch fires both `blur` and `visibilitychange`; count it once.
const DEDUPE_MS = 1500;

/** CBT proctoring: counts tab switches / focus loss / fullscreen exits and auto-submits at the limit. */
export function useProctoring(active: boolean) {
  const attemptId = useExamStore((s) => s.attemptId);
  const maxViolations = useExamStore((s) => s.templateConfig?.proctoring?.maxViolations ?? 3);
  const detectionEnabled = useExamStore((s) => s.templateConfig?.proctoring?.enableTabSwitchDetection !== false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastViolation = useRef(0);

  const handleViolation = useCallback(async (reason: string) => {
    const now = Date.now();
    if (now - lastViolation.current < DEDUPE_MS) return;
    lastViolation.current = now;

    const store = useExamStore.getState();
    if (store.isSubmitting) return;
    let count = store.violations + 1;
    store.setViolations(count);

    if (attemptId) {
      try {
        const res = await fetch(`/api/attempts/${attemptId}/violation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
        if (res.ok) {
          const data = await res.json();
          // Server count survives reloads, so it is authoritative
          if (typeof data.count === "number" && data.count > count) {
            count = data.count;
            store.setViolations(count);
          }
        }
      } catch {
        // offline: the local count still applies
      }
    }

    const left = maxViolations - count;
    if (left <= 0) {
      toast.error("Exam auto-submitted due to repeated proctoring violations.");
      useExamStore.getState().submitExam("VIOLATIONS");
    } else if (left === 1) {
      toast.error(`Final warning: ${reason} One more violation will auto-submit your exam.`, { duration: 8000 });
    } else {
      toast.warning(`Warning: ${reason} (${count}/${maxViolations})`, { duration: 5000 });
    }
  }, [attemptId, maxViolations]);

  useEffect(() => {
    if (!active) return;

    const onVisibility = () => {
      if (document.hidden && detectionEnabled) handleViolation("You switched tabs or minimised the window.");
    };
    const onBlur = () => {
      if (detectionEnabled) handleViolation("The exam window lost focus.");
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.key === "F12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === "i" || k === "j" || k === "c"))) {
        e.preventDefault();
        toast.warning("Developer tools are disabled during the exam.");
      } else if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "p", "u", "s"].includes(k)) {
        e.preventDefault();
        toast.warning("Copy, paste, print and save are disabled during the exam.");
      }
    };
    const onFullscreen = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) handleViolation("You exited fullscreen mode.");
    };

    setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [active, detectionEnabled, handleViolation]);

  const enterFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {
      // Some browsers (e.g. iOS Safari) don't support fullscreen; the exam still works
    });
  }, []);

  return { enterFullscreen, isFullscreen, maxViolations };
}

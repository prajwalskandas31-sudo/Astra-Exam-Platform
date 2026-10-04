"use client";

import { useCallback, useEffect, useState } from "react";
import { useExamStore } from "@/store/examStore";
import { toast } from "sonner";

export function useProctoring() {
  const { logViolation, submitExam, attemptId } = useExamStore();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleViolation = useCallback(async (reason: string) => {
    logViolation();
    
    // Attempt to log to backend
    if (attemptId) {
      try {
        await fetch(`/api/attempts/${attemptId}/violation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
      } catch (err) {
        console.error("Failed to log violation to backend", err);
      }
    }

    const currentViolations = useExamStore.getState().violations;
    
    if (currentViolations === 1) {
      toast.warning(`Warning: ${reason}`, { duration: 5000 });
    } else if (currentViolations === 2) {
      toast.error(`Final Warning: ${reason}. Next violation will auto-submit the exam!`, { duration: 8000 });
    } else if (currentViolations >= 3) {
      toast.error(`Exam auto-submitted due to repeated violations.`);
      submitExam(); // Trigger auto-submission
    }
  }, [logViolation, attemptId, submitExam]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation("Tab switch or window minimized.");
      }
    };

    const handleBlur = () => {
      handleViolation("Window lost focus.");
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.warning("Right-click is disabled during the exam.");
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12
      if (e.key === "F12") {
        e.preventDefault();
        handleViolation("Developer tools access is prohibited.");
      }
      // Block Ctrl+C, Ctrl+V, Ctrl+P, Ctrl+U
      if (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "p" || e.key === "u")) {
        e.preventDefault();
        toast.warning(e.key === "u" ? "View source is disabled." : "Copy, Paste, and Print are disabled.");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        handleViolation("Exited fullscreen mode.");
      } else {
        setIsFullscreen(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [handleViolation]);

  const enterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  };

  return { enterFullscreen, isFullscreen };
}

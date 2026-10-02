"use client";

import { useEffect, useRef } from "react";
import { useExamStore } from "@/store/examStore";

export function useAutosave() {
  const { attemptId, answers, timeRemaining, isOnline, setOnlineStatus } = useExamStore();
  const lastSyncTime = useRef<number>(Date.now());

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnlineStatus]);

  const stateRef = useRef({ answers, timeRemaining, attemptId, isOnline });
  
  useEffect(() => {
    stateRef.current = { answers, timeRemaining, attemptId, isOnline };
  }, [answers, timeRemaining, attemptId, isOnline]);

  // Autosave logic (Periodic)
  useEffect(() => {
    if (!attemptId) return;

    const syncData = async () => {
      const { answers: currentAnswers, timeRemaining: currentTime, attemptId: currentId, isOnline: currentOnline } = stateRef.current;
      if (!currentOnline || !currentId) return;

      try {
        await fetch(`/api/attempts/${currentId}/sync`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: currentAnswers,
            timeRemaining: currentTime,
          }),
        });
        lastSyncTime.current = Date.now();
        localStorage.setItem(`backup_${currentId}`, JSON.stringify({ answers: currentAnswers, timeRemaining: currentTime }));
      } catch (error) {
        console.error("Autosave failed", error);
      }
    };

    // Trigger sync every 15 seconds
    const interval = setInterval(() => {
      syncData();
    }, 15000);

    return () => clearInterval(interval);
  }, [attemptId]);

  return { lastSyncTime: lastSyncTime.current };
}

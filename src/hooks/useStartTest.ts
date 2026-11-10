"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deviceId } from "@/lib/deviceStore";

/** Start (or resume) a test attempt and open the exam screen. */
export function useStartTest() {
  const router = useRouter();
  const [startingId, setStartingId] = useState<string | null>(null);

  const start = async (testId: string) => {
    setStartingId(testId);
    try {
      const res = await fetch("/api/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, deviceId: deviceId() }),
      });
      const data = await res.json().catch(() => null);
      // Exam Centre tests start from the centre lobby (start code, seat, offline paper)
      if (res.status === 403 && data?.centre) {
        router.push(`/exam/centre/${testId}`);
        return;
      }
      if (!res.ok || !data?.attemptId) throw new Error(data?.error || "Couldn't start the test");
      if (data.resumed) toast.info("Resuming your unfinished attempt");
      router.push(`/exam/${data.attemptId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start the test");
      setStartingId(null);
    }
  };

  return { start, startingId };
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/fetcher";

/** Start (or resume) a test attempt and open the exam screen. */
export function useStartTest() {
  const router = useRouter();
  const [startingId, setStartingId] = useState<string | null>(null);

  const start = async (testId: string) => {
    setStartingId(testId);
    try {
      const res = await apiFetch<{ attemptId: string; resumed: boolean }>("/api/attempts/start", { method: "POST", json: { testId } });
      if (res.resumed) toast.info("Resuming your unfinished attempt");
      router.push(`/exam/${res.attemptId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start the test");
      setStartingId(null);
    }
  };

  return { start, startingId };
}

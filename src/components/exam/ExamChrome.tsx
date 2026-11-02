"use client";

import { CheckCircle2, Clock, CloudOff, Loader2 } from "lucide-react";
import { useExamStore } from "@/store/examStore";
import type { SyncState } from "@/hooks/useAutosave";
import { cn } from "@/lib/utils";

export const formatClock = (seconds: number) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};

export function SyncBadge({ state }: { state: SyncState }) {
  if (state === "idle") return null;
  const map: Record<Exclude<SyncState, "idle">, { label: string; cls: string }> = {
    saving: { label: "Saving…", cls: "text-slate-400" },
    saved: { label: "All changes saved", cls: "text-emerald-400" },
    offline: { label: "Offline — saved on this device", cls: "text-amber-400" },
    error: { label: "Save failed — retrying", cls: "text-rose-400" },
  };
  const { label, cls } = map[state];
  return (
    <span className={cn("hidden items-center gap-1.5 text-[11px] font-medium md:inline-flex", cls)}>
      {state === "offline" ? <CloudOff className="h-3.5 w-3.5" /> : state === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export function ExamTimer() {
  const timeRemaining = useExamStore((s) => s.timeRemaining);
  const low = timeRemaining < 300;
  return (
    <div className={cn("flex items-center gap-2 rounded-xl border px-3 py-1.5", low ? "border-rose-500/40 bg-rose-500/10" : "border-white/10 bg-white/[0.03]")}>
      <Clock className={cn("h-4 w-4", low ? "text-rose-400" : "text-blue-400")} />
      <span className={cn("font-mono text-base font-bold tabular-nums sm:text-lg", low ? "animate-pulse text-rose-300" : "text-white")} aria-live="off">
        {formatClock(timeRemaining)}
      </span>
    </div>
  );
}

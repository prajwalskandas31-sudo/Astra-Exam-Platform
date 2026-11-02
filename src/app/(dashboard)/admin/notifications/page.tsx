"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, RotateCcw, Send } from "lucide-react";
import { Badge, Btn, Card, EmptyState, ErrorState, PageHeader, PageLoader, Tabs } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

interface Log {
  id: string;
  recipientPhone: string;
  recipientName: string | null;
  type: string;
  channel: string;
  provider: string | null;
  status: "ACCEPTED" | "DELIVERED" | "READ" | "FAILED" | "SKIPPED" | "SENT";
  error: string | null;
  attempts: number;
  reportUrl: string | null;
  createdAt: string;
  payload: { messageText?: string; recipientName?: string };
}

// "SENT" only appears on logs from the old simulator, which never delivered anything
type StatusFilter = "ALL" | "DELIVERED,READ" | "ACCEPTED" | "FAILED" | "SKIPPED,SENT";

const STATUS_BADGE: Record<string, { label: string; tone: "emerald" | "blue" | "rose" | "slate" | "violet" }> = {
  READ: { label: "read", tone: "violet" },
  DELIVERED: { label: "delivered", tone: "emerald" },
  ACCEPTED: { label: "awaiting delivery report", tone: "blue" },
  SENT: { label: "simulated — never delivered", tone: "slate" },
  FAILED: { label: "failed", tone: "rose" },
  SKIPPED: { label: "skipped", tone: "slate" },
};

const TYPE_LABELS: Record<string, string> = {
  RESULT: "Result",
  TEST_ASSIGNED: "New test",
  WEEKLY_REPORT: "Weekly summary",
  PASSWORD_RESET: "Password reset",
  TEST_MESSAGE: "Test message",
};

export default function NotificationLogsPage() {
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const { data, error, loading, reload } = useApi<{ logs: Log[]; counts: Record<string, number> }>(
    `/api/admin/notifications${status === "ALL" ? "" : `?status=${status}`}`
  );
  const [open, setOpen] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const retry = async (ids: string[], key: string) => {
    setRetrying(key);
    try {
      const res = await apiFetch<{ sent: number; failed: number; results: { ok: boolean; error?: string }[] }>("/api/admin/notifications", { method: "POST", json: { ids } });
      if (res.sent) toast.success(`${res.sent} sent`);
      if (res.failed) toast.error(`${res.failed} still failing${res.results.find((r) => !r.ok)?.error ? ` — ${res.results.find((r) => !r.ok)!.error}` : ""}`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry failed");
    } finally {
      setRetrying(null);
    }
  };

  const counts = data?.counts ?? {};
  const retryable = (data?.logs ?? []).filter((l) => l.status === "FAILED" && l.type !== "PASSWORD_RESET").map((l) => l.id).slice(0, 100);
  const notConfigured = (data?.logs ?? []).some((l) => l.error?.includes("not configured"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Logs"
        description="Every WhatsApp and SMS message to students and parents. Providers confirm delivery shortly after accepting a message."
        actions={<Link href="/admin/messaging"><Btn variant="secondary">Messaging settings</Btn></Link>}
      />

      {notConfigured && (
        <Card className="border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200">
          Some messages were skipped because WhatsApp/SMS isn&apos;t set up for your institute yet. <Link href="/admin/messaging" className="font-semibold underline">Set it up</Link> — skipped messages can then be retried.
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs<StatusFilter>
          value={status}
          onChange={setStatus}
          items={[
            { id: "ALL", label: "All", count: Object.values(counts).reduce((a, b) => a + b, 0) },
            { id: "DELIVERED,READ", label: "Delivered", count: (counts.DELIVERED ?? 0) + (counts.READ ?? 0) },
            { id: "ACCEPTED", label: "Awaiting confirmation", count: counts.ACCEPTED ?? 0 },
            { id: "FAILED", label: "Failed", count: counts.FAILED ?? 0 },
            { id: "SKIPPED,SENT", label: "Skipped", count: (counts.SKIPPED ?? 0) + (counts.SENT ?? 0) },
          ]}
        />
        {retryable.length > 0 && (
          <Btn size="sm" variant="secondary" loading={retrying === "all"} disabled={!!retrying} onClick={() => retry(retryable, "all")}>
            <RotateCcw className="h-3.5 w-3.5" />Retry {retryable.length} failed
          </Btn>
        )}
      </div>

      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.logs.length ? (
        <Card><EmptyState icon={Send} title="No messages here" description="Result alerts go out automatically when a student submits a test." /></Card>
      ) : (
        <Card className="divide-y divide-white/[0.05]">
          {data.logs.map((l) => (
            <div key={l.id}>
              <button onClick={() => setOpen(open === l.id ? null : l.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-white/[0.02]" aria-expanded={open === l.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-200">{l.recipientName ?? l.payload.recipientName ?? "Recipient"} <span className="text-slate-500">· {l.recipientPhone}</span></p>
                  <p className="truncate text-xs text-slate-500">
                    {TYPE_LABELS[l.type] ?? l.type.replace(/_/g, " ").toLowerCase()} · {new Date(l.createdAt).toLocaleString()}
                    {l.error && <span className={l.status === "FAILED" ? "text-rose-300" : "text-slate-400"}> · {l.error}</span>}
                  </p>
                </div>
                <Badge tone={l.channel === "SMS" ? "violet" : "emerald"}>{l.channel === "SMS" ? "SMS" : "WhatsApp"}</Badge>
                <Badge tone={STATUS_BADGE[l.status]?.tone ?? "slate"}>{STATUS_BADGE[l.status]?.label ?? l.status.toLowerCase()}{l.attempts > 1 ? ` ×${l.attempts}` : ""}</Badge>
                <ChevronDown className={cn("h-4 w-4 text-slate-500 transition", open === l.id && "rotate-180")} />
              </button>
              {open === l.id && (
                <div className="space-y-2 px-5 pb-4">
                  {l.payload.messageText && <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-sans text-xs text-slate-300">{l.payload.messageText}</pre>}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {l.provider && <span className="text-slate-500">via {l.provider}</span>}
                    {l.reportUrl && <a href={l.reportUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline">Open link →</a>}
                    {(l.status === "FAILED" || l.status === "SKIPPED") && l.type !== "PASSWORD_RESET" && (
                      <Btn size="sm" variant="secondary" loading={retrying === l.id} disabled={!!retrying} onClick={() => retry([l.id], l.id)}>
                        <RotateCcw className="h-3.5 w-3.5" />Retry
                      </Btn>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

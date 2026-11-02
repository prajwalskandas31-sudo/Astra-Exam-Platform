"use client";

import { useState } from "react";
import { ChevronDown, Send } from "lucide-react";
import { Badge, Card, EmptyState, ErrorState, PageHeader, PageLoader } from "@/components/ui/kit";
import { useApi } from "@/lib/fetcher";

interface Log {
  id: string;
  recipientPhone: string;
  type: string;
  status: string;
  reportUrl: string | null;
  createdAt: string;
  payload: { recipientName?: string; testTitle?: string; score?: number; messageText?: string; channel?: string };
}

export default function NotificationLogsPage() {
  const { data, error, loading, reload } = useApi<Log[]>("/api/admin/notifications");
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Notification Logs" description="Every result alert and report card dispatched to students and parents." />
      <Card className="border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200">
        No WhatsApp/email provider is connected yet, so messages are simulated: they are logged here (and to the server console) but not actually delivered.
      </Card>
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.length ? (
        <Card><EmptyState icon={Send} title="No notifications sent yet" description="Result alerts are sent automatically when a student submits a test." /></Card>
      ) : (
        <Card className="divide-y divide-white/[0.05]">
          {data.map((l) => (
            <div key={l.id}>
              <button onClick={() => setOpen(open === l.id ? null : l.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-white/[0.02]" aria-expanded={open === l.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-200">{l.payload.recipientName ?? "Recipient"} <span className="text-slate-500">· {l.recipientPhone}</span></p>
                  <p className="truncate text-xs text-slate-500">{l.payload.testTitle ?? l.type} · {new Date(l.createdAt).toLocaleString()}</p>
                </div>
                <Badge tone={l.type.includes("EMAIL") ? "violet" : "emerald"}>{l.type.includes("EMAIL") ? "Email" : "WhatsApp"}</Badge>
                <Badge tone={l.status === "SENT" ? "blue" : "rose"}>{l.status.toLowerCase()}</Badge>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open === l.id ? "rotate-180" : ""}`} />
              </button>
              {open === l.id && (
                <div className="space-y-2 px-5 pb-4">
                  {l.payload.messageText && <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-sans text-xs text-slate-300">{l.payload.messageText}</pre>}
                  {l.reportUrl && <a href={l.reportUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-400 hover:underline">Open report link →</a>}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

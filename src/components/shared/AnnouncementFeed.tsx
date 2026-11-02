"use client";

import { Megaphone } from "lucide-react";
import { Badge, Card, EmptyState, ErrorState, PageLoader, formatDate } from "@/components/ui/kit";
import { useApi } from "@/lib/fetcher";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: string;
  priority: string;
  createdAt: string;
  author: { name: string; role: string };
}

/** Read-only list of institute announcements for the current viewer's audience. */
export function AnnouncementFeed() {
  const { data, error, loading, reload } = useApi<Announcement[]>("/api/announcements");

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data?.length) {
    return <Card><EmptyState icon={Megaphone} title="No messages yet" description="Announcements from your institute and mentors will appear here." /></Card>;
  }

  return (
    <div className="space-y-3">
      {data.map((a) => (
        <Card key={a.id} className={a.priority === "HIGH" ? "border-rose-500/25 p-5" : "p-5"}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{a.title}</h3>
            {a.priority === "HIGH" && <Badge tone="rose">Important</Badge>}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{a.body}</p>
          <p className="mt-3 text-xs text-slate-500">{a.author.name} · {formatDate(a.createdAt)}</p>
        </Card>
      ))}
    </div>
  );
}

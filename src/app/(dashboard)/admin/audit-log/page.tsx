"use client";

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { Badge, Btn, Card, EmptyState, ErrorState, PageHeader, PageLoader, Tabs } from "@/components/ui/kit";
import { apiFetch } from "@/lib/fetcher";

interface Entry {
  id: string;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  summary: string | null;
  ip: string | null;
  createdAt: string;
}

type Area = "all" | "user" | "test" | "question" | "organization" | "messaging" | "batch";
const AREAS: { id: Area; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "user", label: "Users" },
  { id: "test", label: "Tests" },
  { id: "question", label: "Questions" },
  { id: "batch", label: "Batches" },
  { id: "organization", label: "Institute" },
  { id: "messaging", label: "Messaging" },
];

const tone = (action: string) =>
  /delete|reject|archive/.test(action) ? "rose" : /resetPassword|messaging/.test(action) ? "amber" : /create|approve|publish|import/.test(action) ? "emerald" : "blue";

export default function AuditLogPage() {
  const [area, setArea] = useState<Area>("all");
  const [items, setItems] = useState<Entry[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (before: string | null, replace: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (area !== "all") qs.set("area", area);
      if (before) qs.set("before", before);
      const data = await apiFetch<{ items: Entry[]; nextBefore: string | null }>(`/api/admin/audit?${qs}`);
      setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
      setNext(data.nextBefore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area]);

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" description="Every change made by your staff and admins: who, what and when." />
      <Tabs value={area} onChange={setArea} items={AREAS} />
      {error ? (
        <ErrorState message={error} onRetry={() => load(null, true)} />
      ) : loading && items.length === 0 ? (
        <PageLoader label="Loading activity…" />
      ) : items.length === 0 ? (
        <EmptyState icon={ScrollText} title="No activity yet" description="Changes to users, tests, questions and settings will appear here." />
      ) : (
        <Card>
          <ul className="divide-y divide-white/[0.05]">
            {items.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
                <time className="w-40 shrink-0 text-xs tabular-nums text-slate-500" dateTime={e.createdAt}>
                  {new Date(e.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </time>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-100">{e.summary || e.action}</p>
                  <p className="text-xs text-slate-500">
                    {e.actorName || "Unknown"}
                    {e.actorRole ? ` · ${e.actorRole.replace("_", " ").toLowerCase()}` : ""}
                    {e.ip ? ` · ${e.ip}` : ""}
                  </p>
                </div>
                <Badge tone={tone(e.action)} className="self-start sm:self-center">{e.action}</Badge>
              </li>
            ))}
          </ul>
          {next && (
            <div className="border-t border-white/[0.06] p-4 text-center">
              <Btn variant="secondary" size="sm" loading={loading} onClick={() => load(next, false)}>Load older</Btn>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

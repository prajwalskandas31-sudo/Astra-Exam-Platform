"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Inbox, X } from "lucide-react";
import { Badge, Btn, Card, CardHeader, EmptyState, ErrorState, PageLoader, formatDate } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";

interface TestRequest {
  id: string;
  count: number;
  category: "MOCK" | "PRACTICE";
  examCategory: string | null;
  notes: string | null;
  createdAt: string;
  user: { name: string; email: string; role: string };
}

export function TestRequests() {
  const { data, setData, error, loading, reload } = useApi<TestRequest[]>("/api/requests");
  const [busy, setBusy] = useState<string | null>(null);

  const decide = async (r: TestRequest, status: "APPROVED" | "REJECTED") => {
    setBusy(r.id);
    try {
      await apiFetch(`/api/requests/${r.id}`, { method: "PATCH", json: { status } });
      setData((data ?? []).filter((x) => x.id !== r.id));
      toast.success(status === "APPROVED" ? "Request approved — remember to publish the tests in Test Manager" : "Request declined");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader title="Test requests" description="Extra tests requested by students and parents" icon={Inbox} />
      {loading ? <PageLoader /> : error ? <div className="p-5"><ErrorState message={error} onRetry={reload} /></div> : !data?.length ? (
        <EmptyState icon={Inbox} title="No pending requests" />
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {data.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-100">{r.user.name}</p>
                  <Badge tone={r.user.role === "PARENT" ? "violet" : "blue"}>{r.user.role === "PARENT" ? "Parent" : "Student"}</Badge>
                </div>
                <p className="text-xs text-slate-400">
                  {r.count} {r.category === "MOCK" ? "mock" : "practice"} test{r.count > 1 ? "s" : ""}{r.examCategory ? ` · ${r.examCategory}` : ""} · {formatDate(r.createdAt)}
                </p>
                {r.notes && <p className="mt-1 text-xs italic text-slate-500">“{r.notes}”</p>}
              </div>
              <div className="flex gap-2">
                <Btn size="sm" variant="success" loading={busy === r.id} onClick={() => decide(r, "APPROVED")}><Check className="h-3.5 w-3.5" />Approve</Btn>
                <Btn size="sm" variant="secondary" disabled={busy === r.id} onClick={() => decide(r, "REJECTED")}><X className="h-3.5 w-3.5" />Decline</Btn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

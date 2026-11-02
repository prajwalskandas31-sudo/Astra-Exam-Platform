"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, UserCheck, X } from "lucide-react";
import { Badge, Btn, Card, CardHeader, EmptyState, ErrorState, PageLoader, formatDate } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";

interface PendingUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: AppRole;
  createdAt: string;
}

export function PendingStudents() {
  const { data, setData, error, loading, reload } = useApi<PendingUser[]>("/api/users/pending");
  const [busy, setBusy] = useState<string | null>(null);

  const decide = async (u: PendingUser, status: "APPROVED" | "REJECTED") => {
    setBusy(u.id);
    try {
      await apiFetch(`/api/users/${u.id}/approve`, { method: "PUT", json: { status } });
      setData((data ?? []).filter((x) => x.id !== u.id));
      toast.success(`${u.name} ${status === "APPROVED" ? "approved" : "rejected"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader title="Account approvals" description="New accounts waiting for access" icon={UserCheck} />
      {loading ? <PageLoader /> : error ? <div className="p-5"><ErrorState message={error} onRetry={reload} /></div> : !data?.length ? (
        <EmptyState icon={UserCheck} title="All caught up" description="No accounts are waiting for approval." />
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {data.map((u) => (
            <li key={u.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-100">{u.name}</p>
                  <Badge tone="blue">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                </div>
                <p className="truncate text-xs text-slate-500">{u.email}{u.phone ? ` · ${u.phone}` : ""} · signed up {formatDate(u.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <Btn size="sm" variant="success" loading={busy === u.id} onClick={() => decide(u, "APPROVED")}><Check className="h-3.5 w-3.5" />Approve</Btn>
                <Btn size="sm" variant="secondary" disabled={busy === u.id} onClick={() => decide(u, "REJECTED")}><X className="h-3.5 w-3.5" />Reject</Btn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Layers, Plus, Trash2 } from "lucide-react";
import { Badge, Btn, Card, EmptyState, ErrorState, PageHeader, PageLoader, formatDate, inputClass, scoreTone } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";

interface Batch {
  id: string;
  name: string;
  createdAt: string;
  studentCount: number;
  testCount: number;
  attemptCount: number;
  avgPercentage: number | null;
}

export default function BatchesPage() {
  const { data, error, loading, reload } = useApi<Batch[]>("/api/batches");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/batches", { method: "POST", json: { name } });
      toast.success(`Batch "${name}" created`);
      setName("");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create batch");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: Batch) => {
    if (!window.confirm(`Delete "${b.name}"? Its ${b.studentCount} students will become unassigned (their accounts and results are kept).`)) return;
    try {
      await apiFetch(`/api/batches?id=${b.id}`, { method: "DELETE" });
      toast.success("Batch deleted");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete batch");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Batches" description="Group students into batches. Assign students to a batch from the Users page." />

      <Card className="p-4">
        <form onSubmit={create} className="flex flex-col gap-2 sm:flex-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New batch name, e.g. PLAB 1 — March 2027" className={inputClass} />
          <Btn type="submit" loading={saving} disabled={!name.trim()} className="shrink-0"><Plus className="h-4 w-4" />Create batch</Btn>
        </form>
      </Card>

      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.length ? (
        <Card><EmptyState icon={Layers} title="No batches yet" description="Create your first batch above." /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((b) => (
            <Card key={b.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{b.name}</p>
                  <p className="text-xs text-slate-500">Created {formatDate(b.createdAt)}</p>
                </div>
                <button onClick={() => remove(b)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400" aria-label={`Delete ${b.name}`}><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/[0.03] p-2"><p className="text-lg font-bold text-white">{b.studentCount}</p><p className="text-[11px] text-slate-500">students</p></div>
                <div className="rounded-lg bg-white/[0.03] p-2"><p className="text-lg font-bold text-white">{b.attemptCount}</p><p className="text-[11px] text-slate-500">attempts</p></div>
                <div className="rounded-lg bg-white/[0.03] p-2">
                  {b.avgPercentage != null ? <Badge tone={scoreTone(b.avgPercentage)}>{b.avgPercentage}%</Badge> : <p className="text-lg font-bold text-slate-600">—</p>}
                  <p className="mt-1 text-[11px] text-slate-500">avg score</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500">Tip: assign students to batches on the <Link href="/admin/users" className="text-blue-400 hover:underline">Users</Link> page.</p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Megaphone, Send, Trash2 } from "lucide-react";
import { Badge, Btn, Card, CardHeader, EmptyState, ErrorState, Field, PageHeader, PageLoader, formatDate, inputClass } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { isAdmin } from "@/lib/roles";
import type { Announcement } from "@/components/shared/AnnouncementFeed";

const AUDIENCE_LABEL: Record<string, string> = { ALL: "Students & parents", STUDENTS: "Students", PARENTS: "Parents" };

export default function AnnouncementsPage() {
  const { data: session } = useSession();
  const { data, setData, error, loading, reload } = useApi<(Announcement & { author: { name: string; role: string } })[]>("/api/announcements");
  const [form, setForm] = useState({ title: "", body: "", audience: "ALL", priority: "NORMAL" });
  const [sending, setSending] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const created = await apiFetch<Announcement>("/api/announcements", { method: "POST", json: form });
      setData([created, ...(data ?? [])]);
      setForm({ title: "", body: "", audience: "ALL", priority: "NORMAL" });
      toast.success(`Announcement posted to ${AUDIENCE_LABEL[form.audience].toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't post announcement");
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await apiFetch(`/api/announcements?id=${id}`, { method: "DELETE" });
      setData((data ?? []).filter((a) => a.id !== id));
      toast.success("Announcement deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete");
    }
  };

  const canDelete = (a: Announcement & { author: { name: string } }) => isAdmin(session?.user?.role) || a.author.name === session?.user?.name;

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Post updates that appear on student and parent dashboards." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 lg:self-start">
          <CardHeader title="New announcement" icon={Send} />
          <form onSubmit={send} className="space-y-4 p-5">
            <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="e.g. Full mock this Sunday at 10 AM" required /></Field>
            <Field label="Message"><textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className={inputClass} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Audience">
                <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className={inputClass}>
                  <option value="ALL">Students & parents</option>
                  <option value="STUDENTS">Students only</option>
                  <option value="PARENTS">Parents only</option>
                </select>
              </Field>
              <Field label="Priority">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputClass}>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">Important</option>
                </select>
              </Field>
            </div>
            <Btn type="submit" className="w-full" loading={sending} disabled={!form.title.trim() || !form.body.trim()}><Send className="h-4 w-4" />Post announcement</Btn>
          </form>
        </Card>

        <div className="space-y-3 lg:col-span-3">
          {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.length ? (
            <Card><EmptyState icon={Megaphone} title="No announcements yet" description="Posts you publish will be listed here." /></Card>
          ) : data.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                    <Badge>{AUDIENCE_LABEL[a.audience] ?? a.audience}</Badge>
                    {a.priority === "HIGH" && <Badge tone="rose">Important</Badge>}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{a.body}</p>
                  <p className="mt-2 text-xs text-slate-500">{a.author.name} · {formatDate(a.createdAt)}</p>
                </div>
                {canDelete(a) && (
                  <button onClick={() => remove(a.id)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400" aria-label="Delete announcement"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

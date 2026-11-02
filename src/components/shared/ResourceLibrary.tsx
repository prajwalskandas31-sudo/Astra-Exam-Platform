"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ExternalLink, FolderDown, Link2, Trash2 } from "lucide-react";
import { Badge, Btn, Card, CardHeader, EmptyState, ErrorState, Field, PageLoader, Tabs, formatDate, inputClass } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { isAdmin } from "@/lib/roles";

interface Resource {
  id: string;
  title: string;
  url: string;
  category: string;
  subject: string | null;
  description: string | null;
  createdAt: string;
  author: { id: string; name: string };
}

const CATEGORIES = ["Notes", "Formula Sheets", "Previous Papers", "Videos", "Syllabus"];

/** Shared study-material library. Staff can add/remove links; everyone else browses. */
export function ResourceLibrary({ canManage }: { canManage: boolean }) {
  const { data: session } = useSession();
  const { data, setData, error, loading, reload } = useApi<Resource[]>("/api/resources");
  const [category, setCategory] = useState("ALL");
  const [form, setForm] = useState({ title: "", url: "", category: "Notes", subject: "", description: "" });
  const [saving, setSaving] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await apiFetch<Resource>("/api/resources", { method: "POST", json: form });
      setData([created, ...(data ?? [])]);
      setForm({ title: "", url: "", category: form.category, subject: form.subject, description: "" });
      toast.success("Resource shared with students");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add resource");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: Resource) => {
    if (!window.confirm(`Remove "${r.title}"?`)) return;
    try {
      await apiFetch(`/api/resources?id=${r.id}`, { method: "DELETE" });
      setData((data ?? []).filter((x) => x.id !== r.id));
      toast.success("Resource removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove");
    }
  };

  const items = (data ?? []).filter((r) => category === "ALL" || r.category === category);

  const list = loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={reload} /> : (
    <div className="space-y-4">
      <Tabs value={category} onChange={setCategory} items={[{ id: "ALL", label: "All", count: data?.length ?? 0 }, ...CATEGORIES.map((c) => ({ id: c, label: c }))]} />
      {items.length === 0 ? (
        <Card><EmptyState icon={FolderDown} title="No resources here yet" description={canManage ? "Share a link to notes, papers or videos." : "Your mentors haven't shared material in this category yet."} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((r) => (
            <Card key={r.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1.5"><Badge tone="blue">{r.category}</Badge>{r.subject && <Badge>{r.subject}</Badge>}</div>
                {canManage && (r.author.id === session?.user?.id || isAdmin(session?.user?.role)) && (
                  <button onClick={() => remove(r)} className="rounded p-1 text-slate-500 hover:text-rose-400" aria-label="Remove resource"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{r.title}</p>
              {r.description && <p className="mt-1 text-xs text-slate-400">{r.description}</p>}
              <div className="mt-auto flex items-center justify-between pt-4">
                <span className="text-[11px] text-slate-500">{r.author.name} · {formatDate(r.createdAt)}</span>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300">
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  if (!canManage) return list;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:self-start">
        <CardHeader title="Share a resource" description="Link to Google Drive, YouTube, a PDF or any web page." icon={Link2} />
        <form onSubmit={add} className="space-y-3 p-5">
          <Field label="Title"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="Thermodynamics formula sheet" /></Field>
          <Field label="Link"><input required type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={inputClass} placeholder="https://…" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Subject"><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputClass} placeholder="Physics" /></Field>
          </div>
          <Field label="Description (optional)"><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} /></Field>
          <Btn type="submit" className="w-full" loading={saving}>Share with students</Btn>
        </form>
      </Card>
      <div className="lg:col-span-2">{list}</div>
    </div>
  );
}

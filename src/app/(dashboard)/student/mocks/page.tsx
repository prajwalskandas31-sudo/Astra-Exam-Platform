"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Search, Send } from "lucide-react";
import { TestCard, testState, type StudentTest } from "@/components/student/TestCard";
import { Badge, Btn, Card, CardHeader, EmptyState, ErrorState, Field, Modal, PageHeader, PageLoader, Tabs, formatDate, inputClass } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { useStartTest } from "@/hooks/useStartTest";

interface TestRequest {
  id: string;
  count: number;
  category: string;
  examCategory: string | null;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

type Filter = "all" | "MOCK" | "PRACTICE" | "new" | "done";

export default function MockTestsPage() {
  const { data, error, loading, reload } = useApi<StudentTest[]>("/api/tests");
  const requests = useApi<TestRequest[]>("/api/student/remote-test-request");
  const { start, startingId } = useStartTest();
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [form, setForm] = useState({ count: 3, category: "MOCK", examCategory: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const tests = data ?? [];
  const categories = useMemo(() => Array.from(new Set(tests.map((t) => t.template?.examCategory).filter(Boolean))) as string[], [tests]);

  const visible = tests.filter((t) => {
    const s = testState(t);
    if (filter === "MOCK" || filter === "PRACTICE") { if (t.type !== filter) return false; }
    if (filter === "new" && (s.finished.length > 0 || s.inProgress)) return false;
    if (filter === "done" && s.finished.length === 0) return false;
    if (category !== "ALL" && t.template?.examCategory !== category) return false;
    if (query && !t.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const submitRequest = async () => {
    setSubmitting(true);
    try {
      const res = await apiFetch<{ message: string }>("/api/student/remote-test-request", { method: "POST", json: form });
      toast.success(res.message);
      setRequestOpen(false);
      setForm({ count: 3, category: "MOCK", examCategory: "", notes: "" });
      requests.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader label="Loading tests…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mock Tests"
        description="Full-length mocks and practice papers published by your institute."
        actions={<Btn variant="secondary" onClick={() => setRequestOpen(true)}><Send className="h-4 w-4" />Request more tests</Btn>}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs<Filter>
          value={filter}
          onChange={setFilter}
          items={[
            { id: "all", label: "All", count: tests.length },
            { id: "MOCK", label: "Mocks" },
            { id: "PRACTICE", label: "Practice" },
            { id: "new", label: "Not attempted" },
            { id: "done", label: "Completed" },
          ]}
        />
        <div className="flex gap-2">
          {categories.length > 1 && (
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClass} w-auto`} aria-label="Exam category">
              <option value="ALL">All exams</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <div className="relative w-full lg:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tests" className={`${inputClass} pl-9`} />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title={tests.length ? "No tests match your filters" : "No tests published yet"}
            description={tests.length ? "Try a different filter or search term." : "Request tests from your mentor and they'll appear here once published."}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((t) => <TestCard key={t.id} test={t} onStart={start} starting={startingId === t.id} />)}
        </div>
      )}

      {(requests.data ?? []).length > 0 && (
        <Card>
          <CardHeader title="Your test requests" />
          <ul className="divide-y divide-white/[0.05]">
            {(requests.data ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="text-slate-200">{r.count} {r.category === "MOCK" ? "mock" : "practice"} test{r.count > 1 ? "s" : ""}{r.examCategory ? ` · ${r.examCategory}` : ""}</p>
                  <p className="truncate text-xs text-slate-500">{formatDate(r.createdAt)}{r.notes ? ` · ${r.notes}` : ""}</p>
                </div>
                <Badge tone={r.status === "APPROVED" ? "emerald" : r.status === "REJECTED" ? "rose" : "amber"}>{r.status.toLowerCase()}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request more tests"
        description="Your mentor will review the request and publish or schedule the tests."
        footer={<><Btn variant="secondary" onClick={() => setRequestOpen(false)}>Cancel</Btn><Btn loading={submitting} onClick={submitRequest}>Send request</Btn></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Number of tests">
            <input type="number" min={1} max={10} value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} className={inputClass} />
          </Field>
          <Field label="Type">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
              <option value="MOCK">Full mock (proctored)</option>
              <option value="PRACTICE">Practice paper</option>
            </select>
          </Field>
          <Field label="Exam (optional)">
            <input value={form.examCategory} onChange={(e) => setForm({ ...form, examCategory: e.target.value })} placeholder="e.g. JEE, NEET, PLAB" className={inputClass} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes (optional)">
              <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Topics you'd like to focus on, preferred dates…" className={inputClass} />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}

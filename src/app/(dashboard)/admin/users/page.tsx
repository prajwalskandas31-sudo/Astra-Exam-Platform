"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, Search, Trash2, Users } from "lucide-react";
import { Badge, Btn, Card, EmptyState, ErrorState, Field, Modal, PageHeader, PageLoader, Tabs, formatDate, inputClass } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: AppRole;
  status: "APPROVED" | "PENDING" | "REJECTED";
  createdAt: string;
  batchId: string | null;
  batch: string;
  linkedCount: number;
  testsCompleted: number;
  averageScore: number;
}

interface Batch { id: string; name: string }

type RoleFilter = "ALL" | "STUDENT" | "PARENT" | "STAFF" | "ADMIN";

function matchesRole(u: UserRow, f: RoleFilter) {
  if (f === "ALL") return true;
  if (f === "STAFF") return u.role === "FACULTY" || u.role === "MENTOR";
  if (f === "ADMIN") return u.role === "INSTITUTE_ADMIN" || u.role === "SUPER_ADMIN";
  return u.role === f;
}

const emptyForm = { name: "", email: "", phone: "", password: "", role: "STUDENT", batchId: "" };

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const { data, setData, error, loading, reload } = useApi<UserRow[]>("/api/users?scope=all");
  const batches = useApi<Batch[]>("/api/batches");
  const [filter, setFilter] = useState<RoleFilter>("ALL");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const users = data ?? [];
  const visible = users.filter((u) => matchesRole(u, filter) && (!query || `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase())));

  const update = async (u: UserRow, patch: Partial<Pick<UserRow, "role" | "status" | "batchId">>) => {
    try {
      await apiFetch(`/api/users/${u.id}`, { method: "PATCH", json: patch });
      const batchName = patch.batchId !== undefined ? batches.data?.find((b) => b.id === patch.batchId)?.name ?? "Unassigned" : u.batch;
      setData(users.map((x) => (x.id === u.id ? { ...x, ...patch, batch: batchName } : x)));
      toast.success("User updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const remove = async (u: UserRow) => {
    if (!window.confirm(`Delete ${u.name}'s account? Their attempts and results will be removed too. This can't be undone.`)) return;
    try {
      await apiFetch(`/api/users/${u.id}`, { method: "DELETE" });
      setData(users.filter((x) => x.id !== u.id));
      toast.success("User deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const create = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/users", { method: "POST", json: { ...form, batchId: form.batchId || null } });
      toast.success(`Account created for ${form.name}`);
      setOpen(false);
      setForm(emptyForm);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create user");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading users…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const count = (f: RoleFilter) => users.filter((u) => matchesRole(u, f)).length;
  const roleOptions: AppRole[] = session?.user?.role === "SUPER_ADMIN"
    ? ["STUDENT", "PARENT", "MENTOR", "FACULTY", "INSTITUTE_ADMIN", "SUPER_ADMIN"]
    : ["STUDENT", "PARENT", "MENTOR", "FACULTY", "INSTITUTE_ADMIN"];

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Create accounts, change roles, assign batches and manage access." actions={<Btn onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Add user</Btn>} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs<RoleFilter> value={filter} onChange={setFilter} items={[
          { id: "ALL", label: "All", count: count("ALL") },
          { id: "STUDENT", label: "Students", count: count("STUDENT") },
          { id: "PARENT", label: "Parents", count: count("PARENT") },
          { id: "STAFF", label: "Faculty", count: count("STAFF") },
          { id: "ADMIN", label: "Admins", count: count("ADMIN") },
        ]} />
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" className={`${inputClass} pl-9`} />
        </div>
      </div>

      {visible.length === 0 ? (
        <Card><EmptyState icon={Users} title="No users found" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-white/[0.06] bg-black/20 text-xs text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-3 py-3 font-medium">Role</th>
                  <th className="px-3 py-3 font-medium">Batch</th>
                  <th className="px-3 py-3 font-medium">Activity</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {visible.map((u) => {
                  const self = u.id === session?.user?.id;
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-100">{u.name}{self && <span className="text-xs text-slate-500"> (you)</span>}</p>
                        <p className="text-xs text-slate-500">{u.email}{u.phone ? ` · ${u.phone}` : ""} · joined {formatDate(u.createdAt)}</p>
                      </td>
                      <td className="px-3 py-3">
                        <select value={u.role} disabled={self} onChange={(e) => update(u, { role: e.target.value as AppRole })} className={`${inputClass} w-40 py-1.5 text-xs`} aria-label={`Role for ${u.name}`}>
                          {[...new Set([...roleOptions, u.role])].map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        {u.role === "STUDENT" ? (
                          <select value={u.batchId ?? ""} onChange={(e) => update(u, { batchId: e.target.value || null })} className={`${inputClass} w-44 py-1.5 text-xs`} aria-label={`Batch for ${u.name}`}>
                            <option value="">Unassigned</option>
                            {(batches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        ) : <span className="text-xs text-slate-600">—</span>}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-400">
                        {u.role === "STUDENT" ? `${u.testsCompleted} tests · avg ${u.averageScore}%` : u.role === "PARENT" ? `${u.linkedCount} child${u.linkedCount === 1 ? "" : "ren"} linked` : "—"}
                      </td>
                      <td className="px-3 py-3">
                        {u.status === "APPROVED" ? (
                          <button disabled={self} onClick={() => update(u, { status: "REJECTED" })} className="disabled:cursor-default" title={self ? "" : "Click to deactivate"}><Badge tone="emerald">Active</Badge></button>
                        ) : (
                          <button onClick={() => update(u, { status: "APPROVED" })} title="Click to activate"><Badge tone={u.status === "PENDING" ? "amber" : "rose"}>{u.status === "PENDING" ? "Pending" : "Deactivated"}</Badge></button>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {!self && <button onClick={() => remove(u)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400" aria-label={`Delete ${u.name}`}><Trash2 className="h-4 w-4" /></button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add user" description="The account is active immediately. Share the password with the user securely."
        footer={<><Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn><Btn loading={saving} disabled={!form.name || !form.email || form.password.length < 8} onClick={create}>Create account</Btn></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} /></Field>
          <Field label="Mobile (optional)"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} /></Field>
          <Field label="Temporary password" hint="At least 8 characters"><input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} /></Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass}>
              {roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </Field>
          {form.role === "STUDENT" && (
            <Field label="Batch">
              <select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })} className={inputClass}>
                <option value="">Unassigned</option>
                {(batches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
          )}
        </div>
      </Modal>
    </div>
  );
}

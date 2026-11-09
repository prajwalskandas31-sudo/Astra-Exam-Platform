"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { Bell, Download, KeyRound, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { Badge, Btn, Card, CardHeader, ErrorState, Field, Modal, PageLoader, inputClass } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";

interface Profile {
  name: string;
  email: string;
  phone: string | null;
  role: AppRole;
  createdAt: string;
  examTracks: string[];
  organization: { name: string } | null;
  batch: { name: string } | null;
  notifyWhatsapp: boolean;
  notifySms: boolean;
}

const EXAM_TRACKS = ["PLAB", "NEET", "JEE", "GATE", "AFCAT", "COMEDK", "SSC CGL"];

/** Account settings shared by every portal: profile, password, and (students) exam tracks. */
export function ProfileSettings() {
  const { update } = useSession();
  const { data, error, loading, reload } = useApi<Profile>("/api/profile");
  const [form, setForm] = useState({ name: "", phone: "" });
  const [tracks, setTracks] = useState<string[]>([]);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState<string | null>(null);
  const [prefs, setPrefs] = useState({ notifyWhatsapp: true, notifySms: true });

  useEffect(() => {
    if (data) {
      setForm({ name: data.name, phone: data.phone ?? "" });
      setTracks(data.examTracks);
      setPrefs({ notifyWhatsapp: data.notifyWhatsapp, notifySms: data.notifySms });
    }
  }, [data]);

  const saveProfile = async () => {
    setSaving("profile");
    try {
      await apiFetch("/api/profile", { method: "PATCH", json: form });
      await update?.();
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(null);
    }
  };

  const saveTracks = async () => {
    setSaving("tracks");
    try {
      await apiFetch("/api/student/registered-exams", { method: "POST", json: { registeredExams: tracks } });
      toast.success("Exam preferences saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(null);
    }
  };

  const togglePref = async (key: keyof typeof prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await apiFetch("/api/profile", { method: "PATCH", json: { [key]: next[key] } });
      toast.success(next[key] ? "Turned on" : "Turned off");
    } catch (e) {
      setPrefs(prefs);
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    }
  };

  const changePassword = async () => {
    if (pw.newPassword !== pw.confirm) {
      toast.error("New passwords don't match");
      return;
    }
    setSaving("password");
    try {
      await apiFetch("/api/profile", { method: "PATCH", json: { currentPassword: pw.currentPassword, newPassword: pw.newPassword } });
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password changed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change password");
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <PageLoader />;
  if (error || !data) return <ErrorState message={error || "Failed to load profile"} onRetry={reload} />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Profile" icon={UserRound} description="Your name and contact number are visible to your institute." />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone="blue">{ROLE_LABELS[data.role] ?? data.role}</Badge>
            {data.organization && <Badge>{data.organization.name}</Badge>}
            {data.batch && <Badge>{data.batch.name}</Badge>}
          </div>
          <Field label="Full name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Email" hint="Contact your institute admin to change your login email.">
            <input value={data.email} disabled className={inputClass} />
          </Field>
          <Field label="Mobile number" hint="Used for WhatsApp/SMS alerts and password-reset codes. Include the country code if you're outside the institute's country.">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" className={inputClass} />
          </Field>
          <Btn loading={saving === "profile"} onClick={saveProfile}>Save profile</Btn>
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Change password" icon={KeyRound} />
          <div className="space-y-4 p-5">
            <Field label="Current password">
              <input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} className={inputClass} />
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              <input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Confirm new password">
              <input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className={inputClass} />
            </Field>
            <Btn variant="secondary" loading={saving === "password"} disabled={!pw.currentPassword || !pw.newPassword} onClick={changePassword}>Update password</Btn>
          </div>
        </Card>

        <Card>
          <CardHeader title="Notifications" icon={Bell} description="Results, new tests and weekly summaries from your institute. Password-reset codes are always sent." />
          <div className="divide-y divide-white/[0.05]">
            {([["notifyWhatsapp", "WhatsApp messages"], ["notifySms", "SMS messages"]] as const).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm text-slate-200">
                {label}
                <input type="checkbox" role="switch" checked={prefs[key]} onChange={() => togglePref(key)} className="h-4 w-4 accent-blue-500" />
              </label>
            ))}
          </div>
        </Card>

        <PrivacyCard role={data.role} />

        {data.role === "STUDENT" && (
          <Card>
            <CardHeader title="Exams you're preparing for" description="Used to personalise your dashboard." />
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                {[...new Set([...EXAM_TRACKS, ...tracks])].map((t) => {
                  const on = tracks.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => setTracks(on ? tracks.filter((x) => x !== t) : [...tracks, t])}
                      aria-pressed={on}
                      className={on ? "rounded-lg border border-blue-500 bg-blue-600/20 px-3 py-1.5 text-xs font-semibold text-blue-200" : "rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white"}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <Btn variant="secondary" loading={saving === "tracks"} onClick={saveTracks}>Save preferences</Btn>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/** DPDP Act rights: download a copy of your data, or delete your account. */
function PrivacyCard({ role }: { role: AppRole }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const canSelfDelete = role !== "SUPER_ADMIN";

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await apiFetch("/api/profile", { method: "DELETE", json: { password } });
      toast.success("Your account has been deleted.");
      await signOut({ callbackUrl: "/login" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete the account");
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Your data & privacy" icon={ShieldCheck} description="Under India's DPDP Act you can get a copy of your data or have it erased." />
      <div className="flex flex-wrap gap-2 p-5">
        <a href="/api/profile/export" download>
          <Btn variant="secondary" size="sm"><Download className="h-4 w-4" />Download my data</Btn>
        </a>
        {canSelfDelete && (
          <Btn variant="ghost" size="sm" className="text-rose-300 hover:text-rose-200" onClick={() => setOpen(true)}>
            <Trash2 className="h-4 w-4" />Delete my account
          </Btn>
        )}
      </div>
      <Modal
        open={open}
        onClose={() => !deleting && setOpen(false)}
        size="sm"
        title="Delete your account?"
        description="This permanently removes your profile, test results, answers, bookmarks and review queue. It can't be undone."
        footer={
          <>
            <Btn variant="secondary" onClick={() => setOpen(false)} disabled={deleting}>Cancel</Btn>
            <Btn variant="danger" loading={deleting} disabled={!password} onClick={deleteAccount}>Delete permanently</Btn>
          </>
        }
      >
        <Field label="Enter your password to confirm">
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </Field>
      </Modal>
    </Card>
  );
}

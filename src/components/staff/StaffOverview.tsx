"use client";

import Link from "next/link";
import { Activity, AlertTriangle, BookOpen, ClipboardList, GraduationCap, Inbox, Send, TrendingUp, Trophy, UserCheck, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Btn, Card, CardHeader, EmptyState, ErrorState, PageLoader, ProgressBar, StatCard, formatDate, scoreTone } from "@/components/ui/kit";
import { useApi } from "@/lib/fetcher";
import { SetupChecklist, type SetupStep } from "@/components/admin/SetupChecklist";
import { InviteStudentsCard } from "@/components/admin/InviteStudentsCard";

export interface Overview {
  counts: {
    students: number; parents: number; staff: number; admins: number; questions: number; tests: number;
    publishedTests: number; attempts: number; pendingUsers: number; pendingRequests: number;
  };
  avgPercentage: number;
  avgAccuracy: number;
  leaderboard: { id: string; name: string; batch: string; tests: number; avgPercentage: number; best: number }[];
  weakTopics: { topic: string; count: number }[];
  subjects: { name: string; accuracy: number; questions: number }[];
  activity: { date: string; attempts: number; avgPercentage: number }[];
  topTests: { id: string; title: string; attempts: number; questions: number; isPublished: boolean }[];
  recentAttempts: { id: string; student: string; test: string; percentage: number; date: string }[];
  recentNotifications: { id: string; recipientPhone: string; type: string; status: string; createdAt: string }[];
  setup: SetupStep[] | null;
}

export function useOverview() {
  return useApi<Overview>("/api/admin/overview");
}

/** Single-series bar chart of attempts per day (last 14 days). */
export function ActivityChart({ data }: { data: Overview["activity"] }) {
  return (
    <div className="h-56" role="img" aria-label="Attempts per day over the last 14 days">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.map((d) => ({ ...d, label: new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" }) }))} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
          <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
            itemStyle={{ color: "#cbd5e1" }}
            formatter={(v, _n, item) => [`${v} attempts · avg ${(item?.payload as { avgPercentage?: number })?.avgPercentage ?? 0}%`, "Activity"]}
          />
          <Bar dataKey="attempts" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Leaderboard({ rows }: { rows: Overview["leaderboard"] }) {
  if (!rows.length) return <EmptyState icon={Trophy} title="No results yet" description="Rankings appear once students submit tests." />;
  return (
    <ol className="divide-y divide-white/[0.05]">
      {rows.map((s, i) => (
        <li key={s.id} className="flex items-center gap-3 px-5 py-3">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-amber-500/20 text-amber-300" : i < 3 ? "bg-slate-500/20 text-slate-200" : "text-slate-500"}`}>{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-100">{s.name}</p>
            <p className="text-xs text-slate-500">{s.batch} · {s.tests} test{s.tests === 1 ? "" : "s"}</p>
          </div>
          <Badge tone={scoreTone(s.avgPercentage)}>{s.avgPercentage}%</Badge>
        </li>
      ))}
    </ol>
  );
}

export function WeakTopics({ rows }: { rows: Overview["weakTopics"] }) {
  if (!rows.length) return <p className="p-5 text-sm text-slate-500">No weak topics flagged yet.</p>;
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <div className="space-y-3 p-5">
      {rows.map((w) => (
        <div key={w.topic} className="space-y-1">
          <div className="flex justify-between text-sm"><span className="text-slate-200">{w.topic}</span><span className="text-xs text-slate-400">{w.count} student attempt{w.count === 1 ? "" : "s"}</span></div>
          <ProgressBar value={(w.count / max) * 100} tone="rose" />
        </div>
      ))}
    </div>
  );
}

/** Home dashboard for mentors, faculty and admins. */
export function StaffOverview({ basePath, isAdmin }: { basePath: "/mentor" | "/admin"; isAdmin: boolean }) {
  const { data, error, loading, reload } = useOverview();

  if (loading) return <PageLoader label="Loading institute overview…" />;
  if (error || !data) return <ErrorState message={error || "Failed to load"} onRetry={reload} />;
  const c = data.counts;
  const pending = c.pendingUsers + c.pendingRequests;

  return (
    <div className="space-y-6">
      {isAdmin && data.setup && <SetupChecklist steps={data.setup} />}
      <InviteStudentsCard isAdmin={isAdmin} />
      {pending > 0 && (
        <Card className="flex flex-col gap-3 border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-amber-200">
            <Inbox className="h-4 w-4" />
            {c.pendingUsers > 0 && `${c.pendingUsers} account${c.pendingUsers === 1 ? "" : "s"} awaiting approval`}
            {c.pendingUsers > 0 && c.pendingRequests > 0 && " · "}
            {c.pendingRequests > 0 && `${c.pendingRequests} test request${c.pendingRequests === 1 ? "" : "s"}`}
          </p>
          <Link href={`${basePath}/approvals`}><Btn size="sm" variant="secondary">Review now</Btn></Link>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Students" value={c.students} hint={isAdmin ? `${c.parents} parents · ${c.staff} faculty` : undefined} icon={GraduationCap} tone="blue" />
        <StatCard label="Published tests" value={c.publishedTests} hint={`${c.tests} total · ${c.questions} questions`} icon={ClipboardList} tone="violet" />
        <StatCard label="Submitted attempts" value={c.attempts} icon={Activity} tone="emerald" />
        <StatCard label="Average score" value={`${data.avgPercentage}%`} hint={`${data.avgAccuracy}% accuracy`} icon={TrendingUp} tone="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Test activity" description="Attempts submitted per day, last 14 days" icon={Activity} />
          <div className="p-4"><ActivityChart data={data.activity} /></div>
        </Card>
        <Card>
          <CardHeader title="Quick actions" />
          <div className="grid gap-2 p-4">
            <Link href={`${basePath}/question-banks`}><Btn variant="secondary" className="w-full justify-start"><BookOpen className="h-4 w-4" />Add questions</Btn></Link>
            <Link href={`${basePath}/test-manager`}><Btn variant="secondary" className="w-full justify-start"><ClipboardList className="h-4 w-4" />Create a test</Btn></Link>
            <Link href={`${basePath}/approvals`}><Btn variant="secondary" className="w-full justify-start"><UserCheck className="h-4 w-4" />Approvals ({pending})</Btn></Link>
            {isAdmin ? (
              <Link href="/admin/users"><Btn variant="secondary" className="w-full justify-start"><Users className="h-4 w-4" />Manage users</Btn></Link>
            ) : (
              <Link href="/mentor/messages"><Btn variant="secondary" className="w-full justify-start"><Send className="h-4 w-4" />Post announcement</Btn></Link>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Top students" icon={Trophy} />
          <Leaderboard rows={data.leaderboard.slice(0, 5)} />
        </Card>
        <Card>
          <CardHeader title="Most common weak topics" icon={AlertTriangle} />
          <WeakTopics rows={data.weakTopics.slice(0, 6)} />
        </Card>
        <Card>
          <CardHeader title="Recent submissions" action={<Link href={isAdmin ? "/admin/analytics" : "/mentor/students"} className="text-xs font-semibold text-blue-400">More →</Link>} />
          {data.recentAttempts.length === 0 ? <EmptyState title="No submissions yet" /> : (
            <ul className="divide-y divide-white/[0.05]">
              {data.recentAttempts.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-200">{a.student}</p>
                    <p className="truncate text-xs text-slate-500">{a.test} · {formatDate(a.date)}</p>
                  </div>
                  <Badge tone={scoreTone(a.percentage)}>{a.percentage}%</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/** Deeper analytics view: subject accuracy, full leaderboard, weak topics, test usage. */
export function InstituteAnalytics() {
  const { data, error, loading, reload } = useOverview();
  if (loading) return <PageLoader label="Loading analytics…" />;
  if (error || !data) return <ErrorState message={error || "Failed to load"} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Submitted attempts" value={data.counts.attempts} />
        <StatCard label="Average score" value={`${data.avgPercentage}%`} />
        <StatCard label="Average accuracy" value={`${data.avgAccuracy}%`} />
        <StatCard label="Active students" value={data.leaderboard.length} hint={`of ${data.counts.students}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Accuracy by subject" description="Across all submitted attempts" />
          <div className="space-y-4 p-5">
            {data.subjects.length === 0 && <p className="text-sm text-slate-500">No data yet.</p>}
            {data.subjects.map((s) => (
              <div key={s.name} className="space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-slate-200">{s.name}</span><span className="tabular-nums text-slate-400">{s.accuracy}% · {s.questions} answers</span></div>
                <ProgressBar value={s.accuracy} tone={scoreTone(s.accuracy)} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Test activity" description="Last 14 days" />
          <div className="p-4"><ActivityChart data={data.activity} /></div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Leaderboard" description="Average score, top 10" icon={Trophy} />
          <Leaderboard rows={data.leaderboard} />
        </Card>
        <Card>
          <CardHeader title="Weak topics" description="Topics most often flagged below 60% accuracy" icon={AlertTriangle} />
          <WeakTopics rows={data.weakTopics} />
        </Card>
        <Card>
          <CardHeader title="Most attempted tests" icon={ClipboardList} />
          {data.topTests.length === 0 ? <EmptyState title="No tests yet" /> : (
            <ul className="divide-y divide-white/[0.05]">
              {data.topTests.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-200">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.questions} questions · {t.isPublished ? "published" : "draft"}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-white">{t.attempts}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

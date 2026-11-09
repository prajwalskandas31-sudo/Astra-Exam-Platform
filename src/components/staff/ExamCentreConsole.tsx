"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Download, Eye, EyeOff, Inbox, Plus, Printer, RefreshCw, Trash2, Upload, Users, Wand2 } from "lucide-react";
import { Badge, Btn, Card, ErrorState, Field, PageHeader, PageLoader, StatCard, Tabs, inputClass } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type State = "NOT_STARTED" | "WRITING" | "IDLE" | "UPLOADED" | "SUBMITTED" | "FAILED";

interface Student {
  userId: string;
  name: string;
  studentCode: string | null;
  batch: string | null;
  seat: { room: string; row: number; col: number; set: string | null; downloaded: boolean } | null;
  state: State;
  lastSeen: string | null;
  answered: number | null;
  setCode: string | null;
  deviceId: string | null;
  violations: number;
  score: number | null;
  attemptId: string | null;
  error: string | null;
}

interface CentreData {
  test: { id: string; title: string; duration: number; shuffleMode: string; setCount: number; allowOffline: boolean; startCode: string | null; questionCount: number };
  rooms: { name: string; rows: number; cols: number }[];
  students: Student[];
  summary: Record<"total" | "seated" | "notStarted" | "writing" | "idle" | "uploaded" | "submitted" | "failed" | "checkpoints" | "queued", number>;
}

const STATE_STYLE: Record<State, { label: string; cell: string; tone: "slate" | "blue" | "amber" | "violet" | "emerald" | "rose" }> = {
  NOT_STARTED: { label: "Not started", cell: "border-white/10 bg-slate-800/60 text-slate-400", tone: "slate" },
  WRITING: { label: "Writing", cell: "border-blue-400/50 bg-blue-500/20 text-blue-100", tone: "blue" },
  IDLE: { label: "No signal", cell: "border-amber-400/50 bg-amber-500/15 text-amber-100", tone: "amber" },
  UPLOADED: { label: "Grading", cell: "border-violet-400/50 bg-violet-500/20 text-violet-100", tone: "violet" },
  SUBMITTED: { label: "Submitted", cell: "border-emerald-400/50 bg-emerald-500/20 text-emerald-100", tone: "emerald" },
  FAILED: { label: "Needs attention", cell: "border-rose-400/60 bg-rose-500/20 text-rose-100", tone: "rose" },
};

const ago = (iso: string | null) => {
  if (!iso) return "—";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : new Date(iso).toLocaleTimeString();
};

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/**
 * Invigilator console for one Exam Centre test: the start code, rooms and seat plan (neighbours
 * on different sets), a live room view, and the offline answer-sheet queue.
 */
export function ExamCentreConsole({ testId, backHref }: { testId: string; backHref: string }) {
  const { data, error, loading, reload } = useApi<CentreData>(`/api/tests/${testId}/centre`);
  const [tab, setTab] = useState<"live" | "seating" | "sheets">("live");
  const [showCode, setShowCode] = useState(false);
  const [rooms, setRooms] = useState<CentreData["rooms"]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) setRooms(data.rooms);
  }, [data]);

  // Live view refreshes itself every 10 s while the tab is visible
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && reload(), 10_000);
    return () => clearInterval(t);
  }, [reload]);

  const act = async (action: string, extra: Record<string, unknown> = {}, ok?: (r: any) => string) => {
    setBusy(action);
    try {
      const r = await apiFetch<any>(`/api/tests/${testId}/centre`, { method: "POST", json: { action, ...extra } });
      if (ok) toast.success(ok(r));
      reload();
      return r;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const bySeat = useMemo(() => {
    const m = new Map<string, Student>();
    for (const s of data?.students ?? []) if (s.seat) m.set(`${s.seat.room}|${s.seat.row}|${s.seat.col}`, s);
    return m;
  }, [data]);

  if (loading && !data) return <PageLoader label="Loading exam centre…" />;
  if (error || !data) return <ErrorState message={error || "Couldn't load the exam centre"} onRetry={reload} />;

  const { test, summary, students } = data;
  const unseated = students.filter((s) => !s.seat);

  const exportSeatPlan = () => {
    const lines = [["Room", "Row", "Seat", "Student ID", "Name", "Batch", "Set"].map(csvCell).join(",")];
    for (const s of students.filter((x) => x.seat).sort((a, b) => a.seat!.room.localeCompare(b.seat!.room) || a.seat!.row - b.seat!.row || a.seat!.col - b.seat!.col)) {
      lines.push([s.seat!.room, s.seat!.row + 1, s.seat!.col + 1, s.studentCode, s.name, s.batch, s.seat!.set].map(csvCell).join(","));
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `seat-plan-${test.title.replace(/\W+/g, "-")}.csv`;
    a.click();
  };

  const uploadSheets = async (files: FileList | null) => {
    if (!files?.length) return;
    const sheets: unknown[] = [];
    for (const f of Array.from(files)) {
      try {
        const v = JSON.parse(await f.text());
        if (Array.isArray(v)) sheets.push(...v);
        else sheets.push(v);
      } catch {
        toast.error(`${f.name} isn't an answer file`);
      }
    }
    if (!sheets.length) return;
    setBusy("upload");
    try {
      const r = await apiFetch<{ results: { ok: boolean; status?: string; error?: string }[] }>("/api/offline/submissions", { method: "POST", json: { sheets } });
      const okCount = r.results.filter((x) => x.ok).length;
      const bad = r.results.filter((x) => !x.ok);
      toast.success(`${okCount} answer sheet(s) accepted${bad.length ? `, ${bad.length} rejected (${bad[0].error})` : ""}`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Back to tests</Link>
      <PageHeader
        title={`Exam centre · ${test.title}`}
        description={`${test.questionCount} questions · ${test.duration} min · ${test.shuffleMode === "SETS" ? `${test.setCount} sets` : test.shuffleMode === "PER_STUDENT" ? "unique order per student" : "same order for all"}${test.allowOffline ? " · offline allowed" : ""}`}
      />

      <Card className="flex flex-wrap items-center justify-between gap-4 border-amber-500/20 bg-amber-500/5 p-5">
        <div>
          <p className="text-xs font-semibold text-amber-300">Start code — announce it when the exam begins</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-white sm:text-4xl" data-testid="start-code">
            {showCode ? test.startCode : "••••••••"}
          </p>
          <p className="mt-1 max-w-xl text-xs text-slate-400">
            {test.allowOffline
              ? "Devices download the paper beforehand but can't open it until this code is typed in, even with no internet. Keep it to yourself until the start."
              : "Students type this on the exam-centre screen to begin."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="secondary" onClick={() => setShowCode(!showCode)}>{showCode ? <><EyeOff className="h-4 w-4" />Hide</> : <><Eye className="h-4 w-4" />Reveal</>}</Btn>
          <Btn variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Btn>
          <Btn
            variant="ghost"
            loading={busy === "regenerateCode"}
            onClick={() => {
              if (confirm(test.allowOffline ? "Make a new start code? Devices that already downloaded the paper must reconnect to download it again." : "Make a new start code?")) {
                act("regenerateCode", {}, () => "New start code ready");
              }
            }}
          >
            <RefreshCw className="h-4 w-4" />New code
          </Btn>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Students" value={summary.total} icon={Users} />
        <StatCard label="Not started" value={summary.notStarted} tone="slate" />
        <StatCard label="Writing" value={summary.writing} tone="blue" />
        <StatCard label="No signal" value={summary.idle} tone="amber" hint={test.allowOffline ? "Offline devices keep working" : undefined} />
        <StatCard label="Grading" value={summary.uploaded} tone="violet" />
        <StatCard label="Submitted" value={summary.submitted} tone="emerald" />
      </div>

      <Tabs<typeof tab>
        value={tab}
        onChange={setTab}
        items={[
          { id: "live", label: "Live room view" },
          { id: "seating", label: "Rooms & seating", count: summary.seated },
          { id: "sheets", label: "Answer sheets", count: summary.queued + summary.failed },
        ]}
      />

      {tab === "live" && (
        <div className="space-y-6">
          {data.rooms.length === 0 && <p className="text-sm text-slate-400">No rooms yet — add them under “Rooms &amp; seating” to see a seat map. The list below works without one.</p>}
          {data.rooms.map((room) => (
            <Card key={room.name} className="space-y-3 p-5">
              <p className="text-sm font-semibold text-white">{room.name} <span className="text-xs font-normal text-slate-500">· front of room ↑</span></p>
              <div className="overflow-x-auto">
                <div className="grid w-max gap-1.5" style={{ gridTemplateColumns: `repeat(${room.cols}, minmax(4.5rem, 1fr))` }}>
                  {Array.from({ length: room.rows * room.cols }, (_, i) => {
                    const row = Math.floor(i / room.cols);
                    const col = i % room.cols;
                    const s = bySeat.get(`${room.name}|${row}|${col}`);
                    return (
                      <div
                        key={i}
                        title={s ? `${s.name}${s.studentCode ? ` (${s.studentCode})` : ""} — ${STATE_STYLE[s.state].label}${s.deviceId ? ` · ${s.deviceId}` : ""}` : `Row ${row + 1}, Seat ${col + 1} — empty`}
                        className={cn("rounded-lg border px-1.5 py-1 text-center text-[10px] leading-tight", s ? STATE_STYLE[s.state].cell : "border-dashed border-white/[0.06] text-slate-600")}
                      >
                        <p className="font-mono font-semibold">{s ? s.studentCode ?? s.name.split(" ")[0] : `${row + 1}-${col + 1}`}</p>
                        {s && <p className="opacity-80">{s.seat?.set ? `Set ${s.seat.set}` : STATE_STYLE[s.state].label}{s.answered != null && s.state === "WRITING" ? ` · ${s.answered}✓` : ""}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          ))}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/[0.06] text-left text-xs text-slate-400">
                  <tr><th className="px-4 py-2">Student ID</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Seat</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Last heard</th><th className="px-3 py-2">Device</th><th className="px-3 py-2">Flags</th><th className="px-3 py-2 text-right">Score</th></tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {students.map((s) => (
                    <tr key={s.userId} data-testid="centre-row">
                      <td className="px-4 py-2 font-mono text-xs text-slate-300">{s.studentCode ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-100">{s.name}</td>
                      <td className="px-3 py-2 text-xs text-slate-400">{s.seat ? `${s.seat.room} R${s.seat.row + 1} S${s.seat.col + 1}${s.seat.set ? ` · ${s.seat.set}` : ""}` : "—"}</td>
                      <td className="px-3 py-2"><Badge tone={STATE_STYLE[s.state].tone}>{STATE_STYLE[s.state].label}</Badge></td>
                      <td className="px-3 py-2 text-xs text-slate-400">{s.state === "WRITING" || s.state === "IDLE" ? ago(s.lastSeen) : "—"}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{s.deviceId ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{s.violations > 0 ? <span className="text-amber-300">{s.violations} warning{s.violations === 1 ? "" : "s"}</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-200">{s.score ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "seating" && (
        <div className="space-y-6">
          <Card className="space-y-4 p-5">
            <div>
              <p className="text-sm font-semibold text-white">Rooms</p>
              <p className="text-xs text-slate-400">Rows go from the front of the room to the back. Students are seated in student-ID order; side-by-side, front/back and diagonal neighbours always get different sets (with 4+ sets).</p>
            </div>
            {rooms.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_6rem_6rem_auto] items-end gap-2">
                <Field label="Room name"><input value={r.name} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={inputClass} aria-label="Room name" /></Field>
                <Field label="Rows"><input type="number" min={1} max={50} value={r.rows} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, rows: Number(e.target.value) } : x)))} className={inputClass} aria-label="Rows" /></Field>
                <Field label="Seats per row"><input type="number" min={1} max={50} value={r.cols} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, cols: Number(e.target.value) } : x)))} className={inputClass} aria-label="Seats per row" /></Field>
                <button onClick={() => setRooms(rooms.filter((_, j) => j !== i))} className="mb-1 rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400" aria-label="Remove room"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Btn variant="secondary" onClick={() => setRooms([...rooms, { name: `Room ${rooms.length + 1}`, rows: 5, cols: 6 }])}><Plus className="h-4 w-4" />Add room</Btn>
              <Btn loading={busy === "rooms"} onClick={() => act("rooms", { rooms }, (r) => `Rooms saved${r.released ? ` (${r.released} seats released)` : ""}`)}>Save rooms</Btn>
            </div>
            <p className="text-xs text-slate-500">Capacity {rooms.reduce((n, r) => n + (r.rows || 0) * (r.cols || 0), 0)} seats for {summary.total} students.</p>
          </Card>

          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm font-semibold text-white">{summary.seated} of {summary.total} students seated</p>
              {unseated.length > 0 && summary.seated > 0 && <p className="text-xs text-amber-300">{unseated.length} without a seat — add space and seat again.</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn loading={busy === "autoSeat"} disabled={!data.rooms.length} onClick={() => act("autoSeat", {}, (r) => `Seated ${r.seated} students${r.unseated ? `, ${r.unseated} didn't fit` : ""}`)}><Wand2 className="h-4 w-4" />Seat everyone</Btn>
              <Btn variant="secondary" disabled={!summary.seated} onClick={exportSeatPlan}><Download className="h-4 w-4" />Seat plan (CSV)</Btn>
              <Btn variant="ghost" loading={busy === "clearSeats"} disabled={!summary.seated} onClick={() => confirm("Clear the whole seat plan?") && act("clearSeats", {}, () => "Seat plan cleared")}>Clear</Btn>
            </div>
          </Card>
        </div>
      )}

      {tab === "sheets" && (
        <div className="space-y-4">
          <Card className="space-y-3 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-white"><Inbox className="h-4 w-4" />Offline answer sheets</p>
            <p className="text-sm text-slate-300">
              {summary.queued} waiting to be graded · {summary.failed} need attention · {summary.checkpoints} still in progress (checkpoints)
            </p>
            <p className="text-xs text-slate-400">Uploads are graded automatically in the background. Use these only if something is stuck.</p>
            <div className="flex flex-wrap gap-2">
              <Btn variant="secondary" loading={busy === "process"} onClick={() => act("process", {}, (r) => `Graded ${r.processed} answer sheet(s)`)}><RefreshCw className="h-4 w-4" />Grade queued sheets now</Btn>
              <Btn variant="secondary" loading={busy === "upload"} onClick={() => fileInput.current?.click()}><Upload className="h-4 w-4" />Upload answer files</Btn>
              <input ref={fileInput} type="file" accept="application/json,.json" multiple hidden onChange={(e) => uploadSheets(e.target.files)} />
              <Btn
                variant="ghost"
                loading={busy === "collect"}
                disabled={!summary.checkpoints}
                onClick={() =>
                  confirm("End the exam for everyone still writing? Their last saved checkpoint will be submitted and graded.") &&
                  act("collect", {}, (r) => `Collected ${r.collected} unfinished paper(s)`)
                }
              >
                Collect unfinished papers
              </Btn>
            </div>
            <p className="text-xs text-slate-500">“Upload answer files” takes the .json files students download from a computer that couldn&apos;t get online (USB stick). “Collect” is for after the exam: computers that died or never submitted are graded on their last checkpoint.</p>
          </Card>
          {students.filter((s) => s.state === "FAILED").map((s) => (
            <Card key={s.userId} className="border-rose-500/20 p-4 text-sm">
              <span className="font-semibold text-rose-200">{s.studentCode ?? s.name}</span> <span className="text-slate-400">— {s.error}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

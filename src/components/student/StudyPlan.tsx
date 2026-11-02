"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Brain, CalendarClock, Flame, Gauge, Pencil, Target } from "lucide-react";
import { Btn, Card, Field, Modal, ProgressBar, inputClass, scoreTone } from "@/components/ui/kit";
import { apiFetch } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { StudySnapshot } from "@/lib/studySnapshot";

/** GitHub-style activity grid, one cell per day, weeks as columns. */
export function ActivityHeatmap({ days, goal }: { days: StudySnapshot["heatmap"]; goal: number }) {
  const level = (count: number) => (count === 0 ? 0 : count >= goal ? 4 : count >= goal * 0.66 ? 3 : count >= goal * 0.33 ? 2 : 1);
  const colors = ["bg-white/[0.05]", "bg-emerald-900", "bg-emerald-700", "bg-emerald-500", "bg-emerald-400"];
  const weeks: StudySnapshot["heatmap"][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto pb-1" role="img" aria-label="Daily study activity for the last 12 weeks">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((d) => (
              <div key={d.day} title={`${d.day}: ${d.count} question${d.count === 1 ? "" : "s"}`} className={cn("h-3 w-3 rounded-[3px]", colors[level(d.count)])} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-slate-500">
        Less {colors.map((c) => <span key={c} className={cn("h-2.5 w-2.5 rounded-[2px]", c)} />)} More
      </div>
    </div>
  );
}

function Countdown({ days }: { days: number | null }) {
  if (days === null) return <p className="text-sm text-slate-400">No exam date set</p>;
  if (days < 0) return <p className="text-sm text-slate-400">Exam date has passed</p>;
  return (
    <p className="text-2xl font-bold tabular-nums text-white">
      {days === 0 ? "Today" : days}
      {days > 0 && <span className="ml-1 text-sm font-medium text-slate-400">day{days === 1 ? "" : "s"} to go</span>}
    </p>
  );
}

/** Student dashboard card. Pass `readOnly` (parent view) to hide editing and practice links. */
export function StudyPlanCard({ data, onChange, readOnly = false, name }: {
  data: StudySnapshot;
  onChange?: (next: StudySnapshot) => void;
  readOnly?: boolean;
  name?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ targetExamDate: data.targetExamDate?.slice(0, 10) ?? "", dailyGoal: data.dailyGoal });
  const [saving, setSaving] = useState(false);
  const who = name ?? "You";

  const save = async () => {
    setSaving(true);
    try {
      const next = await apiFetch<StudySnapshot>("/api/student/study", { method: "PATCH", json: { targetExamDate: form.targetExamDate || null, dailyGoal: form.dailyGoal } });
      onChange?.(next);
      toast.success("Study plan updated");
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const r = data.readiness;
  return (
    <Card className="overflow-hidden">
      <div className="grid divide-y divide-white/[0.06] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        <div className="space-y-1 p-5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400"><CalendarClock className="h-3.5 w-3.5 text-blue-400" />Exam countdown</p>
          <Countdown days={data.daysToExam} />
          {data.targetExamDate && <p className="text-xs text-slate-500">{new Date(data.targetExamDate).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p>}
          {!readOnly && (
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300">
              <Pencil className="h-3 w-3" />{data.targetExamDate ? "Edit plan" : "Set exam date"}
            </button>
          )}
        </div>

        <div className="space-y-2 p-5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400"><Target className="h-3.5 w-3.5 text-emerald-400" />Today&apos;s goal</p>
          <p className="text-2xl font-bold tabular-nums text-white">
            {data.today.total}<span className="text-sm font-medium text-slate-400"> / {data.dailyGoal} questions</span>
          </p>
          <ProgressBar value={data.today.goalPct} tone={data.today.goalPct >= 100 ? "emerald" : "blue"} />
          <p className="text-xs text-slate-500">{data.today.goalPct >= 100 ? "Goal reached — great work!" : `${data.today.questions} in tests · ${data.today.reviews} reviewed`}</p>
        </div>

        <div className="space-y-1 p-5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400"><Flame className="h-3.5 w-3.5 text-amber-400" />Study streak</p>
          <p className="text-2xl font-bold tabular-nums text-white">
            {data.streak.current}<span className="ml-1 text-sm font-medium text-slate-400">day{data.streak.current === 1 ? "" : "s"}</span>
          </p>
          <p className="text-xs text-slate-500">Best {data.streak.best} · active {data.activeDaysLast14} of last 14 days</p>
          {!readOnly && data.reviews.due > 0 && (
            <Link href="/student/review" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300 hover:text-violet-200">
              <Brain className="h-3 w-3" />{data.reviews.due} review{data.reviews.due === 1 ? "" : "s"} due →
            </Link>
          )}
          {readOnly && <p className="text-xs text-slate-500">{data.reviews.due} revision card{data.reviews.due === 1 ? "" : "s"} due</p>}
        </div>

        <div className="space-y-2 p-5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400"><Gauge className="h-3.5 w-3.5 text-violet-400" />Exam readiness</p>
          {r.answered < 10 ? (
            <p className="text-sm text-slate-400">{who === "You" ? "Answer" : `${who} needs`} at least 10 questions to estimate readiness.</p>
          ) : (
            <>
              <p className="text-2xl font-bold tabular-nums text-white">{r.score}%</p>
              <ProgressBar value={r.score} tone={scoreTone(r.score)} />
              <p className="text-[11px] leading-relaxed text-slate-500" title="Readiness = 50% recent accuracy + 30% syllabus coverage + 20% consistency over 14 days">
                Accuracy {r.accuracy}% · Coverage {r.coverage}% · Consistency {r.consistency}%
              </p>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-white/[0.06] px-5 py-4">
        <p className="mb-2 text-xs font-medium text-slate-400">Last 12 weeks</p>
        <ActivityHeatmap days={data.heatmap} goal={data.dailyGoal} />
      </div>

      {!readOnly && (
        <Modal
          open={editing}
          onClose={() => setEditing(false)}
          title="Your study plan"
          description="Set your exam day and how many questions you aim to do each day."
          size="sm"
          footer={<><Btn variant="secondary" onClick={() => setEditing(false)}>Cancel</Btn><Btn loading={saving} onClick={save}>Save plan</Btn></>}
        >
          <div className="space-y-4">
            <Field label="Exam date" hint="Leave empty if you haven't booked it yet.">
              <input type="date" value={form.targetExamDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, targetExamDate: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Daily goal (questions)" hint="Counts questions answered in tests plus review cards.">
              <input type="number" min={5} max={500} step={5} value={form.dailyGoal} onChange={(e) => setForm({ ...form, dailyGoal: Number(e.target.value) })} className={inputClass} />
            </Field>
          </div>
        </Modal>
      )}
    </Card>
  );
}

"use client";

import Link from "next/link";
import { CalendarClock, Clock, FileText, Play, RotateCcw, Trophy } from "lucide-react";
import { Badge, Btn, Card } from "@/components/ui/kit";

export interface StudentTest {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  totalMarks: number;
  type: "MOCK" | "PRACTICE";
  mode: "CBT" | "OMR";
  scheduledStart: string | null;
  scheduledEnd: string | null;
  template: { name: string; examCategory: string } | null;
  attempts: { id: string; status: string; percentage: number | null; isRetry: boolean; createdAt: string }[];
  _count: { questions: number };
}

export function testState(test: StudentTest) {
  const own = test.attempts.filter((a) => !a.isRetry);
  const inProgress = own.find((a) => a.status === "IN_PROGRESS" || a.status === "PAUSED");
  const finished = own.filter((a) => a.status === "COMPLETED" || a.status === "AUTO_SUBMITTED");
  const best = finished.reduce<number | null>((m, a) => (a.percentage != null && (m == null || a.percentage > m) ? a.percentage : m), null);
  const now = Date.now();
  const notYetOpen = !!test.scheduledStart && new Date(test.scheduledStart).getTime() > now;
  const closed = !!test.scheduledEnd && new Date(test.scheduledEnd).getTime() < now;
  return { inProgress, finished, best, latest: finished[0], notYetOpen, closed };
}

export function TestCard({ test, onStart, starting }: { test: StudentTest; onStart: (id: string) => void; starting: boolean }) {
  const { inProgress, finished, best, latest, notYetOpen, closed } = testState(test);

  return (
    <Card className="flex flex-col p-5 transition hover:border-white/15">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Badge tone={test.type === "MOCK" ? "violet" : "blue"}>{test.type === "MOCK" ? "Mock" : "Practice"}</Badge>
        <Badge tone={test.mode === "OMR" ? "emerald" : "slate"}>{test.mode}</Badge>
        {test.template?.examCategory && <Badge>{test.template.examCategory}</Badge>}
        {inProgress && <Badge tone="amber">In progress</Badge>}
      </div>
      <h3 className="text-base font-semibold leading-snug text-white">{test.title}</h3>
      {test.description && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{test.description}</p>}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{test._count.questions} questions</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{test.duration} min</span>
        {best != null && <span className="inline-flex items-center gap-1 text-emerald-400"><Trophy className="h-3.5 w-3.5" />Best {best.toFixed(0)}%</span>}
      </div>
      {notYetOpen && (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-amber-300"><CalendarClock className="h-3.5 w-3.5" />Opens {new Date(test.scheduledStart!).toLocaleString()}</p>
      )}

      <div className="mt-auto flex gap-2 pt-5">
        {latest && (
          <Link href={`/exam/${latest.id}/results`} className="flex-1">
            <Btn variant="secondary" size="sm" className="w-full">View result</Btn>
          </Link>
        )}
        <Btn
          size="sm"
          className="flex-1"
          loading={starting}
          disabled={notYetOpen || closed || test._count.questions === 0}
          onClick={() => onStart(test.id)}
        >
          {inProgress ? <><Play className="h-3.5 w-3.5" />Resume</> : finished.length ? <><RotateCcw className="h-3.5 w-3.5" />Reattempt</> : closed ? "Closed" : <><Play className="h-3.5 w-3.5" />Start</>}
        </Btn>
      </div>
    </Card>
  );
}

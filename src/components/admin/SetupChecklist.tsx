"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Rocket, X } from "lucide-react";
import { Card, ProgressBar } from "@/components/ui/kit";

export type SetupStep = { id: string; done: boolean };

const STEPS: Record<string, { title: string; description: string; href: string; cta: string }> = {
  branding: { title: "Add your logo and contact details", description: "Shown on the login page, report cards and parent messages.", href: "/admin/organization", cta: "Open branding" },
  batches: { title: "Create your batches", description: "e.g. \"PLAB 2027 Morning\". Tests and analytics can be limited to a batch.", href: "/admin/batches", cta: "Create a batch" },
  students: { title: "Add your students", description: "Share your sign-up link (below) in batch WhatsApp groups, or import a CSV of names, emails and phones.", href: "/admin/users", cta: "Import students" },
  questions: { title: "Build your question bank", description: "Upload a PDF paper (AI extracts the questions), paste JSON, or type them in.", href: "/admin/question-banks", cta: "Add questions" },
  test: { title: "Publish your first test", description: "Pick questions, a template and a schedule. Students see it instantly.", href: "/admin/test-manager", cta: "Create a test" },
  messaging: { title: "Connect WhatsApp or SMS", description: "Results and report cards go to students and parents automatically.", href: "/admin/messaging", cta: "Connect" },
  firstResult: { title: "Get your first result", description: "Once a student submits, rankings, analytics and parent reports start working.", href: "/admin/analytics", cta: "View analytics" },
};

const DISMISS_KEY = "astra.setupChecklist.dismissed";

/** First-run guide on the admin dashboard: what's left before the institute is fully running. */
export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const done = steps.filter((s) => s.done).length;
  if (dismissed || done === steps.length) return null;
  const next = steps.find((s) => !s.done);

  return (
    <Card className="border-blue-500/30 bg-blue-500/[0.04]">
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
            <Rocket className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Get your institute running</h2>
            <p className="mt-0.5 text-xs text-slate-400">{done} of {steps.length} done · most institutes finish in under 15 minutes</p>
          </div>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {}
          }}
          className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-slate-300"
          aria-label="Hide setup checklist"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-5 pt-4"><ProgressBar value={(done / steps.length) * 100} /></div>
      <ol className="divide-y divide-white/[0.05] px-2 py-2">
        {steps.map((s) => {
          const meta = STEPS[s.id];
          if (!meta) return null;
          const isNext = s.id === next?.id;
          return (
            <li key={s.id} className="flex items-center gap-3 px-3 py-3">
              {s.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" /> : <Circle className={`h-5 w-5 shrink-0 ${isNext ? "text-blue-400" : "text-slate-600"}`} />}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${s.done ? "text-slate-500 line-through" : "text-slate-100"}`}>{meta.title}</p>
                {!s.done && <p className="mt-0.5 text-xs text-slate-400">{meta.description}</p>}
              </div>
              {!s.done && (
                <Link
                  href={meta.href}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${isNext ? "bg-blue-600 text-white hover:bg-blue-500" : "border border-white/10 text-slate-300 hover:bg-white/5"}`}
                >
                  {meta.cta}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

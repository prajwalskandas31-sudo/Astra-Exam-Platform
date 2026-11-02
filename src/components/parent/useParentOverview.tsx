"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Btn, Card, EmptyState } from "@/components/ui/kit";
import { useApi } from "@/lib/fetcher";
import type { StudySnapshot } from "@/lib/studySnapshot";
import { cn } from "@/lib/utils";

export interface ChildAttempt {
  id: string;
  test: { id: string; title: string; totalMarks: number; type: string; mode: string };
  score: number;
  accuracy: number;
  percentage: number;
  rank: number | null;
  percentile: number | null;
  isRetry: boolean;
  createdAt: string;
  weakTopics: string[];
  strongTopics: string[];
  mentorComment: string | null;
}

export interface Child {
  id: string;
  name: string;
  email: string;
  batch: string;
  totalTestsAttempted: number;
  avgScore: number;
  avgAccuracy: number;
  latestTest: { title: string; score: number; percentage: number; accuracy: number; rank: number | null; date: string } | null;
  weakTopics: string[];
  study: StudySnapshot;
  subjects: { name: string; accuracy: number; questions: number }[];
  attempts: ChildAttempt[];
}

const STORAGE_KEY = "parent_selected_child";

/** Loads linked children and remembers which child the parent is looking at. */
export function useParentOverview() {
  const api = useApi<{ parentName: string; students: Child[] }>("/api/parent/overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSelectedId(localStorage.getItem(STORAGE_KEY));
    } catch {
      // storage unavailable
    }
  }, []);

  const select = (id: string) => {
    setSelectedId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  };

  const children = api.data?.students ?? [];
  const child = children.find((c) => c.id === selectedId) ?? children[0] ?? null;
  return { ...api, children, child, select };
}

export function ChildSwitcher({ items, activeId, onSelect }: { items: Child[]; activeId?: string; onSelect: (id: string) => void }) {
  if (items.length < 2) return null;
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-white/[0.08] bg-slate-900/60 p-1">
      {items.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold transition", c.id === activeId ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white")}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}

export function NoChildren() {
  return (
    <Card>
      <EmptyState
        icon={UserPlus}
        title="No child linked yet"
        description="Link your child's student account using their email and registered mobile number to see their results."
        action={<Link href="/dashboard/parent/children"><Btn>Link a child</Btn></Link>}
      />
    </Card>
  );
}

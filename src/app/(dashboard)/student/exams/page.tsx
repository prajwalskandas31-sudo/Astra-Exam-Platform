"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { TestCard, testState, type StudentTest } from "@/components/student/TestCard";
import { Btn, Card, EmptyState, ErrorState, PageHeader, PageLoader } from "@/components/ui/kit";
import { useApi } from "@/lib/fetcher";
import { useStartTest } from "@/hooks/useStartTest";

export default function MyExamsPage() {
  const { data, error, loading, reload } = useApi<StudentTest[]>("/api/tests");
  const { start, startingId } = useStartTest();

  if (loading) return <PageLoader label="Loading your exams…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const tests = data ?? [];
  const inProgress = tests.filter((t) => testState(t).inProgress);
  const completed = tests.filter((t) => !testState(t).inProgress && testState(t).finished.length > 0);
  const upcoming = tests.filter((t) => testState(t).notYetOpen);

  const section = (title: string, list: StudentTest[], empty: string) => (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-white">{title} <span className="text-sm font-normal text-slate-500">({list.length})</span></h2>
      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => <TestCard key={t.id} test={t} onStart={start} starting={startingId === t.id} />)}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-8">
      <PageHeader title="My Exams" description="Tests you've started, finished or that are scheduled for you." />
      {tests.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title="No exams yet" description="Start a test from the Mock Tests page." action={<Link href="/student/mocks"><Btn>Browse tests</Btn></Link>} />
        </Card>
      ) : (
        <>
          {section("In progress", inProgress, "Nothing in progress.")}
          {upcoming.length > 0 && section("Scheduled", upcoming, "")}
          {section("Completed", completed, "You haven't completed any tests yet.")}
        </>
      )}
    </div>
  );
}

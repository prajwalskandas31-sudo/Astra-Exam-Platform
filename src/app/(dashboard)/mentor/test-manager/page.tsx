import { TestManager } from "@/components/mentor/TestManager";

export default function TestManagerPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Test Manager</h1>
        <p className="text-slate-400 mt-1">Create and manage exams for your students.</p>
      </div>
      <TestManager />
    </div>
  );
}

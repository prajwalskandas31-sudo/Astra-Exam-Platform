import { TestManager } from "@/components/mentor/TestManager";

export default function AdminTestManager() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Admin Test Manager</h1>
        <p className="text-slate-400 mt-1">Configure exams and practice sets for all students.</p>
      </div>

      <TestManager />
    </div>
  );
}

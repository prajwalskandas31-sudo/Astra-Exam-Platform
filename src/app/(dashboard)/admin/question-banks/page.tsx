import { QuestionBank } from "@/components/mentor/QuestionBank";

export default function AdminQuestionBanks() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Admin Question Bank</h1>
        <p className="text-slate-400 mt-1">Manage global question sets and imports.</p>
      </div>

      <QuestionBank />
    </div>
  );
}

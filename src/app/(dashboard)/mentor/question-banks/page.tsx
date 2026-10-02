import { QuestionBank } from "@/components/mentor/QuestionBank";

export default function QuestionBanksPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Question Banks</h1>
        <p className="text-slate-400 mt-1">Manage and organize your question sets.</p>
      </div>
      <QuestionBank />
    </div>
  );
}

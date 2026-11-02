import { PageHeader } from "@/components/ui/kit";
import { QuestionReports } from "@/components/staff/QuestionReports";

export default function QuestionReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Question Reports" description="Problems students flagged in your question bank. Fix the question to resolve every report on it." />
      <QuestionReports />
    </div>
  );
}

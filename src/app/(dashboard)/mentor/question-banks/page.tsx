import { PageHeader } from "@/components/ui/kit";
import { QuestionBank } from "@/components/mentor/QuestionBank";

export default function QuestionBankPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Question Bank" description="Create, import, edit and publish questions for your tests." />
      <QuestionBank />
    </div>
  );
}

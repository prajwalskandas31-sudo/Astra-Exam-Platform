import { PageHeader } from "@/components/ui/kit";
import { TestManager } from "@/components/mentor/TestManager";

export default function TestManagerPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Test Manager" description="Build tests from your question bank, then publish, schedule or archive them." />
      <TestManager />
    </div>
  );
}

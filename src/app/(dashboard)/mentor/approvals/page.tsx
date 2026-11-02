import { PageHeader } from "@/components/ui/kit";
import { PendingStudents } from "@/components/mentor/PendingStudents";
import { TestRequests } from "@/components/mentor/TestRequests";

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Approvals & Requests" description="Review new accounts and requests for additional tests." />
      <div className="grid gap-6 xl:grid-cols-2">
        <PendingStudents />
        <TestRequests />
      </div>
    </div>
  );
}

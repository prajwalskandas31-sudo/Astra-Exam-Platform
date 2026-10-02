import { PendingStudents } from "@/components/mentor/PendingStudents";
import { TestRequests } from "@/components/mentor/TestRequests";

export default function ApprovalsPage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Approvals & Requests</h1>
        <p className="text-slate-400 mt-1">Manage student registrations and test requests.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white px-1">Registration Requests</h2>
          <PendingStudents />
        </div>
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white px-1">Test Volume Requests</h2>
          <TestRequests />
        </div>
      </div>
    </div>
  );
}

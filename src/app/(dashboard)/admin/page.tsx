import { PageHeader } from "@/components/ui/kit";
import { StaffOverview } from "@/components/staff/StaffOverview";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" description="Your institute's users, content and results at a glance." />
      <StaffOverview basePath="/admin" isAdmin />
    </div>
  );
}

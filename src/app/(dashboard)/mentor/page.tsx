import { PageHeader } from "@/components/ui/kit";
import { StaffOverview } from "@/components/staff/StaffOverview";

export default function MentorDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader title="Faculty Dashboard" description="Student performance, pending work and test activity at a glance." />
      <StaffOverview basePath="/mentor" isAdmin={false} />
    </div>
  );
}

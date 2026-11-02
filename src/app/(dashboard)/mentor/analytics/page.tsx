import { PageHeader } from "@/components/ui/kit";
import { InstituteAnalytics } from "@/components/staff/StaffOverview";

export default function MentorAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Batch Analytics" description="Where your students are strong, and where they need help." />
      <InstituteAnalytics />
    </div>
  );
}

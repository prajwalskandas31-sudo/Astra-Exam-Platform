import { PageHeader } from "@/components/ui/kit";
import { InstituteAnalytics } from "@/components/staff/StaffOverview";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Academy Analytics" description="Institute-wide performance, leaderboards and weak topics." />
      <InstituteAnalytics />
    </div>
  );
}

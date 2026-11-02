import { PageHeader } from "@/components/ui/kit";
import { ProfileSettings } from "@/components/shared/ProfileSettings";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your admin account. Institute branding lives under Organization." />
      <ProfileSettings />
    </div>
  );
}

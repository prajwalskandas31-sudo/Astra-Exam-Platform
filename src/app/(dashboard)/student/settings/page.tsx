import { PageHeader } from "@/components/ui/kit";
import { ProfileSettings } from "@/components/shared/ProfileSettings";

export default function StudentSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your profile, password and exam preferences." />
      <ProfileSettings />
    </div>
  );
}

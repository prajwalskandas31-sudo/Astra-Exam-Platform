import { PageHeader } from "@/components/ui/kit";
import { ProfileSettings } from "@/components/shared/ProfileSettings";

export default function MentorSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your faculty profile and password." />
      <ProfileSettings />
    </div>
  );
}

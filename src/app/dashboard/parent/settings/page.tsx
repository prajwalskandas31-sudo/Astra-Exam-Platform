import { PageHeader } from "@/components/ui/kit";
import { ProfileSettings } from "@/components/shared/ProfileSettings";

export default function ParentSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your profile and the number used for WhatsApp reports." />
      <ProfileSettings />
    </div>
  );
}

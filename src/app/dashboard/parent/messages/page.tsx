import { PageHeader } from "@/components/ui/kit";
import { AnnouncementFeed } from "@/components/shared/AnnouncementFeed";

export default function ParentMessagesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Announcements from your child's institute and faculty." />
      <AnnouncementFeed />
    </div>
  );
}

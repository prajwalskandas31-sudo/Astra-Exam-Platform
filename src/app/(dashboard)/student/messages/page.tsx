import { PageHeader } from "@/components/ui/kit";
import { AnnouncementFeed } from "@/components/shared/AnnouncementFeed";

export default function StudentMessagesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Announcements from your institute and mentors." />
      <AnnouncementFeed />
    </div>
  );
}

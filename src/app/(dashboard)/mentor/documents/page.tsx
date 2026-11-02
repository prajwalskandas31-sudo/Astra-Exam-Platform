import { PageHeader } from "@/components/ui/kit";
import { ResourceLibrary } from "@/components/shared/ResourceLibrary";

export default function MentorDocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Study Materials" description="Share notes, formula sheets, previous papers and videos with your students." />
      <ResourceLibrary canManage />
    </div>
  );
}

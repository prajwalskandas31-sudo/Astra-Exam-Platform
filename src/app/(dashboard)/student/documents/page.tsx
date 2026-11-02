import { PageHeader } from "@/components/ui/kit";
import { ResourceLibrary } from "@/components/shared/ResourceLibrary";

export default function StudentResourcesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Resources" description="Notes, formula sheets, previous papers and videos shared by your mentors." />
      <ResourceLibrary canManage={false} />
    </div>
  );
}

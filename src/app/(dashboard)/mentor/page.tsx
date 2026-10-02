import { DashboardOverview } from "@/components/mentor/DashboardOverview";

export default function MentorDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Mentor Dashboard</h1>
        <p className="text-slate-400 mt-1">Platform overview and student performance tracking.</p>
      </div>

      <DashboardOverview />
    </div>
  );
}

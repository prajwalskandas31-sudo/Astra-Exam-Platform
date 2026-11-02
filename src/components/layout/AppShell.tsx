import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

/** Authenticated portal chrome shared by every role's dashboard. */
export async function AppShell({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-slate-950 font-sans text-slate-100">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-indigo-600/10 blur-[100px]" />

      <Sidebar user={session.user} />
      <main className="relative z-10 flex-1 overflow-y-auto px-4 pb-10 pt-20 sm:px-6 lg:px-10 lg:pt-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

import { ReactNode } from "react";

export default function ExamLayout({ children }: { children: ReactNode }) {
  // Distraction-free layout without portal navigation; pages manage their own scrolling
  return <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950">{children}</div>;
}

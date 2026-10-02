import { ReactNode } from "react"

export default function ExamLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-screen bg-white overflow-hidden flex flex-col">
      {/* Strict fullscreen layout without standard navigation */}
      {children}
    </div>
  )
}

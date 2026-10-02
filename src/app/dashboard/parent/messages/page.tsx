"use client";

import { MessageSquare, User, Bell } from "lucide-react";

export default function ParentMessagesPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Parent Messages & Inbox</h1>
        <p className="text-sm text-slate-400 mt-1">Direct feedback and notifications from coaching institute faculty</p>
      </div>

      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          Faculty Feedback & Updates
        </h2>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded">Dr. Rajesh Sharma (Physics Lead)</span>
              <span className="text-xs text-slate-500">2026-01-14</span>
            </div>
            <h3 className="font-bold text-white text-sm">Great improvement in Ray Optics</h3>
            <p className="text-xs text-slate-300">Prajwal scored 94% in the recent Ray Optics chapter test. He has shown strong formula recall and numerical speed.</p>
          </div>
        </div>
      </div>

    </div>
  );
}

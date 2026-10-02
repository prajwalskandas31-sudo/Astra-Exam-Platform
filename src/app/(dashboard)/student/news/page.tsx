"use client";

import { Newspaper, Bell, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";

export default function NewsPage() {
  const updates = [
    {
      id: "1",
      tag: "exam",
      tagColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      title: "New Physics Exam Available",
      desc: "A comprehensive physics exam covering mechanics and thermodynamics has been published. All students are encouraged to attempt it before the deadline.",
      date: "2026-01-15"
    },
    {
      id: "2",
      tag: "announcement",
      tagColor: "bg-rose-500/20 text-rose-400 border-rose-500/30",
      title: "Platform Maintenance Scheduled",
      desc: "The platform will undergo scheduled maintenance on January 20th from 2:00 AM to 4:00 AM. During this time, some features may be unavailable.",
      date: "2026-01-14"
    },
    {
      id: "3",
      tag: "update",
      tagColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      title: "New Study Materials Added",
      desc: "New study materials for Chemistry and Biology have been added to the documents section. Check them out to enhance your preparation.",
      date: "2026-01-12"
    },
    {
      id: "4",
      tag: "general",
      tagColor: "bg-slate-500/20 text-slate-400 border-white/10",
      title: "Exam Tips and Best Practices",
      desc: "Here are some tips to help you perform better in your exams: Read questions carefully, manage your time wisely, and review your answers before submission.",
      date: "2026-01-10"
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">News & Updates</h1>
        <p className="text-sm text-slate-400 mt-1">Latest announcements, exam alerts & platform updates</p>
      </div>

      {/* Featured Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-bold rounded uppercase tracking-wider">
            IMPORTANT
          </span>
          <h2 className="text-base font-bold text-white">Welcome to the Exam Platform!</h2>
          <p className="text-xs text-slate-300">
            Stay updated with the latest exams, announcements, and study materials. Check this page regularly for updates.
          </p>
        </div>
      </div>

      {/* Recent Updates List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-indigo-400" />
          Recent Updates
        </h2>

        <div className="space-y-3">
          {updates.map((item) => (
            <div key={item.id} className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${item.tagColor}`}>
                  {item.tag}
                </span>
                <span className="text-xs text-slate-500">{item.date}</span>
              </div>
              <h3 className="font-bold text-white text-base">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

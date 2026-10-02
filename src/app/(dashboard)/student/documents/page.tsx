"use client";

import { useState } from "react";
import { FolderDown, FileText, BookOpen, Download, Calendar, HelpCircle, Lightbulb } from "lucide-react";

export default function ResourcesPage() {
  const [activeCategory, setActiveCategory] = useState<string>("pdf");

  const categories = [
    { id: "formula", label: "Formula Sheets", icon: FileText },
    { id: "notes", label: "Revision Notes", icon: BookOpen },
    { id: "pdf", label: "Important PDFs", icon: Download },
    { id: "schedule", label: "Syllabus & Schedule", icon: Calendar },
    { id: "practice", label: "Practice Sets", icon: HelpCircle },
    { id: "tips", label: "Tips & Strategies", icon: Lightbulb },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Resources</h1>
        <p className="text-sm text-slate-400 mt-1">Study materials, formula reference sheets, revision notes and syllabus guides</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Categories Menu */}
        <div className="space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-white/10 h-fit">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">RESOURCE CATEGORIES</p>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-md'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content */}
        <div className="lg:col-span-3 bg-slate-900/60 border border-white/10 rounded-2xl p-8 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {categories.find(c => c.id === activeCategory)?.label}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Important PDFs for revision and preparation</p>
          </div>

          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
              <FolderDown className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-300">No resources yet</p>
            <p className="text-xs text-slate-500 max-w-sm">Resources in this category will appear here when added by your institute mentors.</p>
          </div>
        </div>

      </div>

    </div>
  );
}

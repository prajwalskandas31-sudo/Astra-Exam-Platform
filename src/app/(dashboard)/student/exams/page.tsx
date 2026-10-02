"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, ChevronDown, ChevronUp, Layers, Play } from "lucide-react";
import Link from "next/link";

export default function MyExamsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPkg, setExpandedPkg] = useState<string | null>("pkg-trial");

  const myPackages = [
    {
      id: "pkg-trial",
      title: "Free Trial Pack For JEE Mains",
      course: "JEE Mains",
      totalTests: 6,
      series: [
        { title: "Free Trial - Class 11 PCM", count: "2 tests" },
        { title: "Free Trial - Class 12 PCM", count: "4 tests" }
      ]
    },
    {
      id: "pkg-full",
      title: "JEE Main 2026 Vijeta Full Test Series",
      course: "JEE Mains",
      totalTests: 187,
      series: [
        { title: "Chapterwise Physics Tests", count: "45 tests" },
        { title: "Chapterwise Chemistry Tests", count: "45 tests" },
        { title: "Chapterwise Mathematics Tests", count: "45 tests" },
        { title: "Full Length Mock Tests", count: "52 tests" }
      ]
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">My Exams</h1>
        <p className="text-sm text-slate-400 mt-1">Access all your enrolled test packages & series</p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text"
          placeholder="Search exams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Package List Accordion */}
      <div className="space-y-4">
        {myPackages.map((pkg) => {
          const isExpanded = expandedPkg === pkg.id;
          return (
            <div key={pkg.id} className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden transition-all">
              <div 
                onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)}
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">TEST PACKAGE</span>
                    <h3 className="text-base font-bold text-white leading-tight">{pkg.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Course: <strong className="text-slate-300">{pkg.course}</strong></p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-400">{pkg.totalTests}</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Tests</p>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Series List */}
              {isExpanded && (
                <div className="p-5 border-t border-white/10 bg-black/20 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{pkg.series.length} TEST SERIES INCLUDED</p>
                  <div className="flex flex-wrap gap-3">
                    {pkg.series.map((s, idx) => (
                      <Link key={idx} href="/student/mocks">
                        <div className="px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer">
                          <span>{s.title}</span>
                          <span className="px-2 py-0.5 bg-blue-500/20 rounded-md text-[10px] font-bold text-blue-200">{s.count}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

"use client";

import { useState } from "react";
import { Bookmark, Search, Filter, Layers, CheckCircle2, XCircle, HelpCircle, EyeOff, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BookmarksPage() {
  const [selectedResultStatus, setSelectedResultStatus] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewLayout, setViewLayout] = useState<"list" | "grid">("list");

  const resultStatuses = [
    { id: "all", label: "All", count: 0 },
    { id: "correct", label: "Correct", count: 0, color: "text-emerald-400 border-emerald-500/30" },
    { id: "incorrect", label: "Incorrect", count: 0, color: "text-rose-400 border-rose-500/30" },
    { id: "partial", label: "Partially Correct", count: 0, color: "text-amber-400 border-amber-500/30" },
    { id: "left", label: "Left", count: 0, color: "text-slate-400 border-white/10" },
    { id: "unevaluated", label: "Un-Evaluated", count: 0, color: "text-blue-400 border-blue-500/30" },
    { id: "weighted", label: "Weighted Question", count: 0, color: "text-purple-400 border-purple-500/30" },
    { id: "ignored", label: "Ignored", count: 0, color: "text-slate-500 border-white/10" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Bookmarked Questions</h1>
        <p className="text-sm text-slate-400 mt-1">Review saved questions, solutions & formula tags</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/10 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Total Bookmarks</p>
            <p className="text-3xl font-black text-purple-200 mt-1">0</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
            <Bookmark className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Subjects</p>
            <p className="text-3xl font-black text-blue-200 mt-1">0</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Topics</p>
            <p className="text-3xl font-black text-emerald-200 mt-1">0</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <Filter className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md">
          <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Difficulty Mix</p>
          <div className="flex items-center gap-2 mt-2 text-[10px] font-bold">
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded">0 Easy</span>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded">0 Med</span>
            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded">0 Hard</span>
          </div>
        </div>

      </div>

      {/* Result Status Pills */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MY BOOKMARKS FILTER</p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {resultStatuses.map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedResultStatus(st.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                selectedResultStatus === st.id
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                  : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/10'
              }`}
            >
              {st.label} ({st.count})
            </button>
          ))}
        </div>
      </div>

      {/* Smart Filters Bar & View Toggles */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Difficulty buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-1">DIFFICULTY:</span>
          {["all", "easy", "medium", "hard"].map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                selectedDifficulty === diff
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>

        {/* Search & Layout toggle */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => setViewLayout("list")}
              className={`p-1.5 rounded-lg ${viewLayout === "list" ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setViewLayout("grid")}
              className={`p-1.5 rounded-lg ${viewLayout === "grid" ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Bookmarks Display List */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
          <Bookmark className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-300">No bookmarks found</p>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">Start practicing and bookmark questions during test attempts to review them later.</p>
      </div>

    </div>
  );
}

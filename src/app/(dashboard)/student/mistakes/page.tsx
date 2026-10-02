"use client";

import { useState } from "react";
import { FileSpreadsheet, AlertCircle, CheckCircle2, XCircle, RefreshCw, Filter, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MistakesPage() {
  const [mistakeView, setMistakeView] = useState<"test" | "chapter">("test");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "last3" | "last5" | "last30">("all");

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-black text-white tracking-tight">Mistakes</h1>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 rounded uppercase tracking-wider">
            NEW
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Revisit questions which you either attempted incorrectly or didn't attempt in the paper
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sub Tabs */}
        <div className="space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-white/10 h-fit">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">MY MISTAKES</p>
          {[
            { id: "test", label: "Test-wise", badge: "NEW" },
            { id: "chapter", label: "Chapter-wise" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMistakeView(tab.id as any)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                mistakeView === tab.id
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-md'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-orange-500 text-slate-950 rounded uppercase">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right Content */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Filters Bar */}
          <div className="flex items-center gap-2 bg-slate-900/60 p-4 rounded-2xl border border-white/10">
            <span className="text-xs font-bold text-slate-400 mr-2">Test Type:</span>
            {[
              { id: "all", label: "All" },
              { id: "last3", label: "Last 3 Tests" },
              { id: "last5", label: "Last 5 Tests" },
              { id: "last30", label: "Attempted in last 30 days" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterPeriod(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterPeriod === f.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Overview Graph Box */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Your Mistakes Overview</h3>
                <p className="text-xs text-slate-400 mt-0.5">This graph shows how you performed through different tests you attempted</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Incorrect Qs
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Correct Qs
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  Not attempted Qs
                </span>
              </div>
            </div>

            <div className="py-12 text-center text-xs text-slate-500 bg-black/20 rounded-xl border border-white/5">
              No data available yet. Attempt tests to start tracking mistakes.
            </div>
          </div>

          {/* Test-wise Mistakes Table */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Test-wise Mistakes</h3>
              <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-white">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sort By
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[10px] text-slate-400 uppercase bg-black/40 border-b border-white/10">
                  <tr>
                    <th className="p-3">Test name</th>
                    <th className="p-3 text-blue-400">Accuracy Trend</th>
                    <th className="p-3 text-rose-400">Attempted Wrong</th>
                    <th className="p-3 text-slate-400">Not Attempted</th>
                    <th className="p-3 text-emerald-400">Attempted Correct</th>
                    <th className="p-3 text-slate-300">Total Questions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No test mistakes recorded. Keep taking tests to generate error notebook reviews.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

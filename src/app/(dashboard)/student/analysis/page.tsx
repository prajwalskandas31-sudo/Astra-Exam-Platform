"use client";

import { useState } from "react";
import { BarChart3, Clock, HelpCircle, AlertTriangle, Layers, Award } from "lucide-react";

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<"performance" | "timeline" | "qstype" | "quality" | "time" | "difficulty" | "chapter">("performance");
  const [timeFilter, setTimeFilter] = useState<"all" | "last3" | "last5" | "last10">("all");
  const [showPercentage, setShowPercentage] = useState(false);

  const subNavItems = [
    { id: "performance", label: "Performance", icon: BarChart3 },
    { id: "timeline", label: "Timeline", icon: Clock },
    { id: "qstype", label: "Qs Type Breakup", icon: HelpCircle },
    { id: "quality", label: "Quality of Attempts", icon: AlertTriangle },
    { id: "time", label: "Time Analysis", icon: Clock },
    { id: "difficulty", label: "Difficulty Analysis", icon: Layers },
    { id: "chapter", label: "Chapter Analysis", icon: Award },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Analysis</h1>
        <p className="text-sm text-slate-400 mt-1">Deep analytics across score, accuracy, difficulty, question types & time usage</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sub Navigation */}
        <div className="space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-white/10 h-fit">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">ANALYSIS MODULES</p>
          {subNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-md'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Header Filters */}
          <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2">
              {[
                { id: "all", label: "All Tests" },
                { id: "last3", label: "Last 3 Tests" },
                { id: "last5", label: "Last 5 Tests" },
                { id: "last10", label: "Last 10 Tests" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTimeFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    timeFilter === f.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>% Show Percentage</span>
              <button 
                onClick={() => setShowPercentage(!showPercentage)}
                className={`w-9 h-5 rounded-full transition-colors relative ${showPercentage ? 'bg-blue-600' : 'bg-white/20'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${showPercentage ? 'left-4.5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Subject Summary Table */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[10px] text-slate-400 uppercase bg-black/40 border-b border-white/10">
                  <tr>
                    <th className="p-3">Subject</th>
                    <th className="p-3 text-amber-400">Average Score</th>
                    <th className="p-3 text-emerald-400">Attempted Correct</th>
                    <th className="p-3 text-rose-400">Attempted Wrong</th>
                    <th className="p-3 text-slate-400">Not Attempted</th>
                    <th className="p-3 text-slate-500">Not Visited Qs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-bold text-blue-400">Physics</td>
                    <td className="p-3 font-semibold">0.0</td>
                    <td className="p-3 text-emerald-400">0</td>
                    <td className="p-3 text-rose-400">0</td>
                    <td className="p-3">0</td>
                    <td className="p-3 text-slate-500">0</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-bold text-emerald-400">Chemistry</td>
                    <td className="p-3 font-semibold">0.0</td>
                    <td className="p-3 text-emerald-400">0</td>
                    <td className="p-3 text-rose-400">0</td>
                    <td className="p-3">0</td>
                    <td className="p-3 text-slate-500">0</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-bold text-purple-400">Mathematics</td>
                    <td className="p-3 font-semibold">0.0</td>
                    <td className="p-3 text-emerald-400">0</td>
                    <td className="p-3 text-rose-400">0</td>
                    <td className="p-3">0</td>
                    <td className="p-3 text-slate-500">0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Test-wise Breakdown */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Test-wise Breakdown</h3>
            <div className="text-center py-12 text-xs text-slate-500 bg-black/20 rounded-xl border border-white/5">
              No test attempts found matching current filter settings.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

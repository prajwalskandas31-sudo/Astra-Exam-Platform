"use client";

import { useState } from "react";
import { BarChart3, AlertCircle, CheckCircle2, TrendingUp, Layers, Users } from "lucide-react";

export default function MentorAnalyticsPage() {
  const [selectedBatch, setSelectedBatch] = useState("JEE 2026 Batch A");

  const batches = ["JEE 2026 Batch A", "NEET Achievers 2026", "COMEDK FastTrack"];

  const topicWeaknesses = [
    { topic: "Chemical Kinetics", subject: "Chemistry", avgAccuracy: "34%", status: "Needs Attention" },
    { topic: "Rotational Dynamics", subject: "Physics", avgAccuracy: "41%", status: "Needs Attention" },
    { topic: "Integration & Definite Integrals", subject: "Mathematics", avgAccuracy: "52%", status: "Developing" },
    { topic: "Electrostatics & Capacitance", subject: "Physics", avgAccuracy: "78%", status: "Strong" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Batch Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">Batch performance overview, score distribution, and automated weakness detection</p>
      </div>

      {/* Batch selector */}
      <div className="flex items-center gap-3 bg-slate-900/60 p-4 rounded-2xl border border-white/10">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select Batch:</span>
        <div className="flex gap-2">
          {batches.map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBatch(b)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                selectedBatch === b
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Students</p>
          <p className="text-3xl font-black text-white mt-1">42</p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Batch Avg Score</p>
          <p className="text-3xl font-black text-emerald-300 mt-1">68.4%</p>
        </div>

        <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 backdrop-blur-md">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Top Batch Rank</p>
          <p className="text-3xl font-black text-blue-300 mt-1">AIR #14</p>
        </div>

        <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 backdrop-blur-md">
          <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Weak Topics Alert</p>
          <p className="text-3xl font-black text-rose-300 mt-1">2 Topics</p>
        </div>

      </div>

      {/* Weakness Detection Table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            Automated Topic Weakness Identification
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[10px] text-slate-400 uppercase bg-black/40 border-b border-white/10">
              <tr>
                <th className="p-3">Topic</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Batch Avg Accuracy</th>
                <th className="p-3">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {topicWeaknesses.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="p-3 font-bold text-white">{item.topic}</td>
                  <td className="p-3 text-slate-400">{item.subject}</td>
                  <td className="p-3 font-bold text-blue-400">{item.avgAccuracy}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                      item.status === 'Needs Attention'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : item.status === 'Developing'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

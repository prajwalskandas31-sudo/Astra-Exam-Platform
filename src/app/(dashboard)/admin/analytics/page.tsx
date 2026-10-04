"use client";

import { BarChart3, TrendingUp, Award, Users, ShieldCheck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { name: "Week 1", "Batch Alpha": 65, "Batch Beta": 55, "Institute Avg": 60 },
  { name: "Week 2", "Batch Alpha": 68, "Batch Beta": 62, "Institute Avg": 65 },
  { name: "Week 3", "Batch Alpha": 75, "Batch Beta": 66, "Institute Avg": 70 },
  { name: "Week 4", "Batch Alpha": 82, "Batch Beta": 74, "Institute Avg": 78 },
];

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Academy Analytics & Leaderboards</h1>
        <p className="text-sm text-slate-400 mt-1">Institute-wide average score trends, batch performance comparisons & top student rankings</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Institute Avg Accuracy</p>
          <p className="text-3xl font-black text-white mt-1">67.8%</p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Cutoff Clearance Rate</p>
          <p className="text-3xl font-black text-emerald-300 mt-1">84.2%</p>
        </div>

        <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 backdrop-blur-md">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Top Batch Rank</p>
          <p className="text-3xl font-black text-blue-300 mt-1">AIR #14</p>
        </div>

        <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/10 backdrop-blur-md">
          <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Exams Taken This Month</p>
          <p className="text-3xl font-black text-purple-300 mt-1">324</p>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Batch Performance Trends (Last 4 Weeks)
        </h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="Batch Alpha" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Batch Beta" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Institute Avg" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Student Leaderboard */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Institute Top Rank Leaderboard
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[10px] text-slate-400 uppercase bg-black/40 border-b border-white/10">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Student</th>
                <th className="p-3">Batch</th>
                <th className="p-3">Avg Score</th>
                <th className="p-3">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/[0.02]">
                <td className="p-3 font-black text-amber-400">#1</td>
                <td className="p-3 font-bold text-white">Prajwal Skanda S</td>
                <td className="p-3 text-slate-400">JEE 2026 Batch A</td>
                <td className="p-3 font-bold text-emerald-400">94.5%</td>
                <td className="p-3 text-blue-400 font-bold">96.2%</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="p-3 font-black text-slate-300">#2</td>
                <td className="p-3 font-bold text-white">Ananya Roy</td>
                <td className="p-3 text-slate-400">NEET Achievers 2026</td>
                <td className="p-3 font-bold text-emerald-400">91.0%</td>
                <td className="p-3 text-blue-400 font-bold">93.8%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

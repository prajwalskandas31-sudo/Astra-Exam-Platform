"use client";

import { useState, useEffect } from "react";
import { Award, CheckCircle2, XCircle, Percent, Trophy, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function MyResultsPage() {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/attempts/history")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAttempts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalAttempted = attempts.length;
  const totalCorrect = attempts.reduce((acc, curr) => acc + (curr.correctCount || 0), 0);
  const totalIncorrect = attempts.reduce((acc, curr) => acc + (curr.incorrectCount || 0), 0);
  const avgPercentage = totalAttempted > 0 
    ? (attempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / totalAttempted).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">My Results</h1>
        <p className="text-sm text-slate-400 mt-1">Overall Performance Report - Track your exam performance and detailed analysis</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tests Attempted</p>
          <p className="text-3xl font-black text-white mt-1">{totalAttempted}</p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Total Correct
          </p>
          <p className="text-3xl font-black text-emerald-300 mt-1">{totalCorrect}</p>
        </div>

        <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 backdrop-blur-md">
          <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            Total Incorrect
          </p>
          <p className="text-3xl font-black text-rose-300 mt-1">{totalIncorrect}</p>
        </div>

        <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 backdrop-blur-md">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5" />
            Avg Percentage
          </p>
          <p className="text-3xl font-black text-blue-300 mt-1">{avgPercentage}%</p>
        </div>

      </div>

      {/* Test wise Performance Summary */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          Test wise Performance Summary
        </h2>

        {totalAttempted === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
              <Trophy className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-400">No tests yet</p>
            <Link href="/student/practice">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-5 rounded-xl shadow-lg shadow-blue-600/30 text-xs">
                Take an Exam
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[10px] text-slate-400 uppercase bg-black/40 border-b border-white/10">
                <tr>
                  <th className="p-3">Test Title</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Accuracy</th>
                  <th className="p-3">Percentage</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-white/[0.02]">
                    <td className="p-3 font-semibold text-white">{att.test?.title || "Mock Attempt"}</td>
                    <td className="p-3 text-slate-400">{new Date(att.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 font-bold text-blue-400">{att.score || 0}</td>
                    <td className="p-3 text-emerald-400 font-bold">{att.accuracy ? `${att.accuracy}%` : "-"}</td>
                    <td className="p-3 font-bold text-purple-400">{att.percentage ? `${att.percentage}%` : "-"}</td>
                    <td className="p-3">
                      <Link href={`/report/${att.id}`}>
                        <Button className="bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 h-7 text-[10px] font-bold px-3 rounded-lg">
                          View Report
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

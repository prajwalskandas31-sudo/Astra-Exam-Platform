"use client";

import { useEffect, useState } from "react";
import { Clock, Trophy, Play, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HistoryPage() {
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Exam History</h1>
        <p className="text-sm text-slate-400 mt-1">Complete chronological history of your exam attempts</p>
      </div>

      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          All Exam Attempts
        </h2>

        {attempts.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
              <Clock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-300">No exam attempts yet</p>
              <p className="text-xs text-slate-500">Start taking exams to see your history here</p>
            </div>
            <Link href="/student/buy-exams">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-blue-600/30 text-xs">
                Browse Exams
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {attempts.map((att) => (
              <div key={att.id} className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">{att.test?.title || "Exam Attempt"}</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Attempted on {new Date(att.createdAt).toLocaleDateString()} • Mode: <strong className="text-blue-400">{att.mode}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-400">{att.score || 0} pts</p>
                    <p className="text-[10px] text-slate-400">{att.accuracy ? `${att.accuracy}% acc` : ""}</p>
                  </div>
                  <Link href={`/report/${att.id}`}>
                    <Button className="bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 h-8 text-xs font-bold px-4 rounded-lg">
                      View Report
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

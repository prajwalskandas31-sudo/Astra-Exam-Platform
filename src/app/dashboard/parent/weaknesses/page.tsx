"use client";

import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

export default function ParentWeaknessesPage() {
  const topics = [
    { topic: "Chemical Kinetics", subject: "Chemistry", status: "Needs Attention", acc: "34%" },
    { topic: "Rotational Dynamics", subject: "Physics", status: "Needs Attention", acc: "41%" },
    { topic: "Definite Integrals", subject: "Mathematics", status: "Developing", acc: "58%" },
    { topic: "Electrostatics", subject: "Physics", status: "Strong", acc: "82%" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Child Weakness Tracker</h1>
        <p className="text-sm text-slate-400 mt-1">Automated topic-by-topic mastery breakdown for targeted revision guidance</p>
      </div>

      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          Topic Mastery Classification
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[10px] text-slate-400 uppercase bg-black/40 border-b border-white/10">
              <tr>
                <th className="p-3">Topic</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Child Accuracy</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {topics.map((t, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="p-3 font-bold text-white">{t.topic}</td>
                  <td className="p-3 text-slate-400">{t.subject}</td>
                  <td className="p-3 font-bold text-blue-400">{t.acc}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      t.status === 'Needs Attention' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                      t.status === 'Developing' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {t.status}
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

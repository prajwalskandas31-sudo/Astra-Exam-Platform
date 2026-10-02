"use client";

import { Send, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function AdminNotificationsPage() {
  const logs = [
    { id: "log-1", recipient: "+91 6362612641", type: "RESULT_NOTIFICATION", status: "SENT", date: "2026-01-15 14:32" },
    { id: "log-2", recipient: "+91 98765 43210", type: "WEEKLY_REPORT", status: "SENT", date: "2026-01-14 09:15" },
    { id: "log-3", recipient: "+91 91234 56789", type: "TEST_ASSIGNED", status: "SENT", date: "2026-01-12 18:00" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">WhatsApp Notification Logs</h1>
        <p className="text-sm text-slate-400 mt-1">Audit log of automated WhatsApp result dispatches, encrypted report link URL generation & delivery statuses</p>
      </div>

      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Send className="w-5 h-5 text-emerald-400" />
          Dispatch Activity Log
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[10px] text-slate-400 uppercase bg-black/40 border-b border-white/10">
              <tr>
                <th className="p-3">Recipient Phone</th>
                <th className="p-3">Notification Type</th>
                <th className="p-3">Encryption Token</th>
                <th className="p-3">Status</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-white/[0.02]">
                  <td className="p-3 font-mono font-bold text-white">{l.recipient}</td>
                  <td className="p-3 text-slate-300 font-semibold">{l.type}</td>
                  <td className="p-3 text-emerald-400 font-mono text-[10px]">AES-256 Validated</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded uppercase">
                      {l.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{l.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

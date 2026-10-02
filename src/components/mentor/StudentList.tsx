"use client";

import { useEffect, useState } from "react";

export function StudentList() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setStudents(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl text-slate-400">Loading students...</div>;

  return (
    <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl text-slate-100">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Enrolled Students</h2>
        <span className="text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-md border border-blue-500/30">
          {students.length} Total
        </span>
      </div>

      {students.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border border-white/5 rounded-xl bg-white/[0.01]">
          No approved students found.
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {students.map((student) => (
            <div key={student.id} className="p-4 border border-white/10 rounded-xl hover:bg-white/[0.04] transition-colors flex justify-between items-center bg-white/[0.02]">
              <div>
                <p className="font-semibold text-slate-200">{student.name}</p>
                <p className="text-sm text-slate-400">{student.email}</p>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-medium">Batch: <span className="text-slate-300">{student.batch || 'Unassigned'}</span></p>
              </div>
              <div className="text-right bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <p className="text-sm font-medium text-slate-400">Tests: <span className="font-bold text-slate-200">{student.testsCompleted}</span></p>
                <p className="text-sm font-medium text-slate-400">Avg: <span className={student.averageScore > 70 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{student.averageScore}%</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function DashboardOverview() {
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    const res = await fetch("/api/mentor/stats");
    const data = await res.json();
    setStats(data);
  };

  const fetchStudents = async () => {
    const res = await fetch("/api/mentor/students");
    const data = await res.json();
    setStudents(data);
  };

  useEffect(() => {
    fetchStats();
    fetchStudents();
  }, []);

  const handleSaveComment = async () => {
    if (!selectedAttempt) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/attempts/${selectedAttempt.id}/comment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment })
      });
      if (res.ok) {
        alert("Comment saved successfully!");
        fetchStudents();
        // Update local state
        setSelectedAttempt({ ...selectedAttempt, mentorComment: comment });
      }
    } catch (err) {
      alert("Failed to save comment.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: stats?.totalStudents, icon: "👥", color: "from-blue-600/20 to-blue-500/10" },
          { label: "Questions in Bank", value: stats?.totalQuestions, icon: "📚", color: "from-indigo-600/20 to-indigo-500/10" },
          { label: "Tests Created", value: stats?.totalTests, icon: "📝", color: "from-emerald-600/20 to-emerald-500/10" },
          { label: "Exams Completed", value: stats?.totalAttempts, icon: "✅", color: "from-amber-600/20 to-amber-500/10" },
        ].map((stat, i) => (
          <div key={i} className={`p-6 rounded-2xl border border-white/10 bg-gradient-to-br ${stat.color} backdrop-blur-md`}>
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-3xl font-bold text-white">{stat.value ?? "..." }</div>
            <div className="text-sm text-slate-400 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Student List */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-xl overflow-hidden flex flex-col h-[600px]">
          <h2 className="text-xl font-bold text-white mb-4">Students Activity</h2>
          <div className="overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {students.map(student => (
              <div 
                key={student.id} 
                onClick={() => { setSelectedStudent(student); setSelectedAttempt(null); }}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedStudent?.id === student.id ? 'bg-blue-600/20 border-blue-500/40' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'}`}
              >
                <p className="font-semibold text-slate-200">{student.name}</p>
                <p className="text-xs text-slate-400">{student.email}</p>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500">{student.attempts.length} Tests Taken</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail View */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/10 rounded-2xl p-8 shadow-xl min-h-[600px] flex flex-col">
          {!selectedStudent ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center">
              <div className="text-4xl mb-4">👈</div>
              <p>Select a student from the list to view their stats and performance reports.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-start mb-8 pb-6 border-b border-white/10">
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedStudent.name}</h3>
                  <p className="text-slate-400">{selectedStudent.email} • Joined {new Date(selectedStudent.createdAt).toLocaleDateString()}</p>
                </div>
                <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-white" onClick={() => setSelectedStudent(null)}>Close Profile</Button>
              </div>

              {selectedAttempt ? (
                /* ATTEMPT PERFORMANCE VIEW */
                <div className="flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
                  <button onClick={() => setSelectedAttempt(null)} className="text-blue-400 hover:text-blue-300 text-sm mb-4 flex items-center gap-1">
                    ← Back to attempts
                  </button>
                  
                  <div id="performance-report" className="print:p-0 print:text-black">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-xl font-bold text-white print:text-black">Test Report: {selectedAttempt.test.title}</h4>
                      <Button onClick={downloadPDF} className="bg-blue-600 hover:bg-blue-500 no-print">Download PDF</Button>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div className="p-4 bg-white/[0.05] border border-white/10 rounded-xl print:border-slate-200">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Score Obtained</p>
                        <p className="text-2xl font-bold text-white print:text-black">{selectedAttempt.score ?? 0} / {selectedAttempt.test.totalMarks}</p>
                      </div>
                      <div className="p-4 bg-white/[0.05] border border-white/10 rounded-xl print:border-slate-200">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Date Taken</p>
                        <p className="text-2xl font-bold text-white print:text-black">{new Date(selectedAttempt.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="space-y-4 no-print">
                      <label className="block text-sm font-medium text-slate-300">Mentor Feedback / Comments</label>
                      <textarea 
                        value={comment} 
                        onChange={e => setComment(e.target.value)}
                        placeholder="Leave a comment for the student..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[120px]"
                      />
                      <Button 
                        onClick={handleSaveComment} 
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-500 w-full"
                      >
                        {loading ? "Saving..." : "Save Feedback"}
                      </Button>
                    </div>

                    {selectedAttempt.mentorComment && (
                      <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl print:bg-slate-50 print:border-slate-300">
                        <p className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-2 print:text-slate-600">Saved Feedback</p>
                        <p className="text-slate-200 print:text-black whitespace-pre-wrap">{selectedAttempt.mentorComment}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ATTEMPT LIST VIEW */
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <h4 className="text-lg font-bold text-white mb-4">Exam History</h4>
                  {selectedStudent.attempts.length === 0 ? (
                    <p className="text-slate-500 italic">No tests taken yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedStudent.attempts.map((attempt: any) => (
                        <div 
                          key={attempt.id} 
                          onClick={() => { setSelectedAttempt(attempt); setComment(attempt.mentorComment || ""); }}
                          className="p-5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-all cursor-pointer group"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-slate-200 group-hover:text-white transition-colors">{attempt.test.title}</p>
                              <p className="text-xs text-slate-500">{new Date(attempt.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-blue-400">{attempt.score ?? 0} / {attempt.test.totalMarks}</p>
                              <p className="text-[10px] uppercase font-bold text-slate-500">View Report →</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #performance-report, #performance-report * { visibility: visible; }
          #performance-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

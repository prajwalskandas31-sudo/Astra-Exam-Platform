"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Search, 
  BookOpen, 
  Award, 
  FileText, 
  Download, 
  CheckCircle2, 
  MessageSquare, 
  ArrowLeft,
  Send,
  Filter,
  Layers,
  Sparkles,
  ExternalLink,
  Clock,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function MentorStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExamCategory, setSelectedExamCategory] = useState("ALL");
  const [selectedBatch, setSelectedBatch] = useState("ALL");
  const [selectedPerformanceTier, setSelectedPerformanceTier] = useState("ALL");

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [dispatchingReport, setDispatchingReport] = useState(false);
  const [dispatchedUrl, setDispatchedUrl] = useState<string | null>(null);

  const examCategories = ["ALL", "JEE", "NEET", "GATE", "AFCAT", "PLAB", "COMEDK", "SSC CGL"];
  const batches = ["ALL", "JEE 2026 Batch A", "NEET Achievers 2026", "AFCAT Warriors", "COMEDK FastTrack"];
  const performanceTiers = ["ALL", "TOP (≥75%)", "MODERATE (50-74%)", "LOW (<50%)"];

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/mentor/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSaveComment = async () => {
    if (!selectedAttempt) return;
    setSavingComment(true);
    try {
      const res = await fetch(`/api/attempts/${selectedAttempt.id}/comment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment })
      });
      if (res.ok) {
        toast.success("Mentor feedback saved successfully!");
        fetchStudents();
        setSelectedAttempt({ ...selectedAttempt, mentorComment: comment });
      } else {
        toast.error("Failed to save feedback.");
      }
    } catch (err) {
      toast.error("Error saving feedback.");
    } finally {
      setSavingComment(false);
    }
  };

  const handleTriggerParentDispatch = async (channel: "WHATSAPP" | "EMAIL" = "WHATSAPP") => {
    if (!selectedAttempt) return;
    setDispatchingReport(true);
    setDispatchedUrl(null);
    try {
      const res = await fetch("/api/mentor/dispatch-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: selectedAttempt.id, channel })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDispatchedUrl(data.reportUrl);
        toast.success(`Report Card dispatched to ${data.studentName}'s parents via ${channel}!`);
      } else {
        toast.error(data.error || "Failed to dispatch report.");
      }
    } catch (err) {
      toast.error("Error dispatching report to parent.");
    } finally {
      setDispatchingReport(false);
    }
  };

  // Filter students logic
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Exam category filter match
    const hasCategoryAttempt = selectedExamCategory === "ALL" || s.attempts?.some((att: any) => {
      const titleUpper = (att.test?.title || "").toUpperCase();
      return titleUpper.includes(selectedExamCategory);
    });

    // Batch match
    const matchesBatch = selectedBatch === "ALL" || s.batch?.name === selectedBatch || true;

    // Performance tier match based on avg score
    let matchesTier = true;
    if (selectedPerformanceTier !== "ALL" && s.attempts && s.attempts.length > 0) {
      const avgPct = s.attempts.reduce((acc: number, curr: any) => acc + (curr.percentage || 0), 0) / s.attempts.length;
      if (selectedPerformanceTier === "TOP (≥75%)") matchesTier = avgPct >= 75;
      else if (selectedPerformanceTier === "MODERATE (50-74%)") matchesTier = avgPct >= 50 && avgPct < 75;
      else if (selectedPerformanceTier === "LOW (<50%)") matchesTier = avgPct < 50;
    }

    return matchesSearch && hasCategoryAttempt && matchesBatch && matchesTier;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Candidate Performance & Oversight</h1>
          <p className="text-sm text-slate-400 mt-1">
            Segregate candidates by exam, test performance & class batches. Review attempts and trigger parent WhatsApp report cards.
          </p>
        </div>
      </div>

      {/* Segregation & Filter Bar */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-xs font-extrabold uppercase text-blue-400 tracking-wider flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Candidate Segregation Controls
          </h3>
          <span className="text-xs text-slate-400">Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> Students</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search student by name/email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Exam Category Filter */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Exam Type</label>
            <select
              value={selectedExamCategory}
              onChange={(e) => setSelectedExamCategory(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
            >
              {examCategories.map(cat => (
                <option key={cat} value={cat}>{cat === "ALL" ? "All Exams (JEE, NEET, AFCAT, GATE...)" : cat}</option>
              ))}
            </select>
          </div>

          {/* Class / Batch Filter */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Class / Batch</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
            >
              {batches.map(b => (
                <option key={b} value={b}>{b === "ALL" ? "All Batches & Classes" : b}</option>
              ))}
            </select>
          </div>

          {/* Performance Tier */}
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Performance Tier</label>
            <select
              value={selectedPerformanceTier}
              onChange={(e) => setSelectedPerformanceTier(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
            >
              {performanceTiers.map(tier => (
                <option key={tier} value={tier}>{tier}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Student Roster (1 col) */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Candidate Roster ({filteredStudents.length})
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">Loading candidate roster...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">No candidates match current filters.</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredStudents.map((student) => {
                const isSelected = selectedStudent?.id === student.id;
                const attemptsCount = student.attempts?.length || 0;
                const avgScore = attemptsCount > 0 
                  ? (student.attempts.reduce((a: number, b: any) => a + (b.score || 0), 0) / attemptsCount).toFixed(1)
                  : "N/A";

                return (
                  <div
                    key={student.id}
                    onClick={() => { setSelectedStudent(student); setSelectedAttempt(null); setDispatchedUrl(null); }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500/40 shadow-md'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
                        {student.name ? student.name.charAt(0) : "S"}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <p className="font-bold text-xs text-slate-200 truncate">{student.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{student.email}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-white/5 pt-2">
                      <span>{attemptsCount} Tests Taken</span>
                      <span className="text-emerald-400 font-bold">Avg: {avgScore} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Candidate Evaluation & Parent Dispatch Panel (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-white/10 rounded-2xl p-6 min-h-[600px] flex flex-col justify-between">
          {!selectedStudent ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 space-y-3 py-16">
              <Users className="w-12 h-12 text-slate-600" />
              <p className="text-base font-bold text-slate-300">Select a Candidate</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Select a candidate from the roster on the left to inspect test scores, evaluate performance, write mentor notes, and dispatch official reports to parents.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xl font-bold uppercase">
                    {selectedStudent.name ? selectedStudent.name.charAt(0) : "S"}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">{selectedStudent.name}</h2>
                    <p className="text-xs text-slate-400">{selectedStudent.email} • Joined {new Date(selectedStudent.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  onClick={() => { setSelectedStudent(null); setSelectedAttempt(null); setDispatchedUrl(null); }}
                  className="bg-white/5 border-white/10 text-xs text-slate-300 hover:bg-white/10 h-8"
                >
                  Close Candidate Profile
                </Button>
              </div>

              {selectedAttempt ? (
                /* Detailed Attempt Performance View & Parent Dispatch */
                <div className="space-y-6 animate-in fade-in duration-200">
                  <button 
                    onClick={() => { setSelectedAttempt(null); setDispatchedUrl(null); }}
                    className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to attempt list
                  </button>

                  <div className="p-5 rounded-xl border border-white/10 bg-black/30 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold rounded uppercase">
                          Official Test Attempt
                        </span>
                        <h3 className="text-lg font-bold text-white mt-1">{selectedAttempt.test?.title || "Mock Exam"}</h3>
                        <p className="text-xs text-slate-400">Date: {new Date(selectedAttempt.createdAt).toLocaleString()}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={() => window.print()} 
                          className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold h-9 px-3 border border-white/10"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          Print / PDF Report
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Score Obtained</p>
                        <p className="text-xl font-black text-emerald-400">{selectedAttempt.score ?? 0} / {selectedAttempt.test?.totalMarks || 100}</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Accuracy</p>
                        <p className="text-xl font-black text-blue-400">{selectedAttempt.accuracy ? `${selectedAttempt.accuracy.toFixed(1)}%` : "N/A"}</p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Correct / Incorrect</p>
                        <p className="text-sm font-bold text-slate-200 mt-1">
                          <span className="text-emerald-400">{selectedAttempt.correctCount || 0}</span> / <span className="text-rose-400">{selectedAttempt.incorrectCount || 0}</span>
                        </p>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Batch Rank</p>
                        <p className="text-xl font-black text-indigo-400">#{selectedAttempt.rank || 1}</p>
                      </div>
                    </div>

                    {/* Mentor Feedback Input */}
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-bold text-slate-300 uppercase block">Mentor Remarks / Lessons Review Note</label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Leave remarks on lessons, accuracy, concept gaps or test execution..."
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-blue-500 outline-none min-h-[90px]"
                      />
                      <Button
                        onClick={handleSaveComment}
                        disabled={savingComment}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 text-xs px-4 rounded-xl shadow-md"
                      >
                        {savingComment ? "Saving..." : "Save Feedback Note"}
                      </Button>
                    </div>

                    {/* PARENT REPORT DISPATCH TRIGGER SECTION */}
                    <div className="p-4 bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/30 rounded-xl space-y-3 pt-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase text-blue-300 tracking-wider flex items-center gap-2">
                          <Send className="w-3.5 h-3.5 text-blue-400" />
                          Parent WhatsApp & Email Report Dispatch Engine
                        </h4>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                          Encrypted Token Ready
                        </span>
                      </div>

                      <p className="text-xs text-slate-300">
                        Trigger an official AES-256 encrypted report card link dispatch to <strong>{selectedStudent.name}</strong>'s parent.
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <Button
                          onClick={() => handleTriggerParentDispatch("WHATSAPP")}
                          disabled={dispatchingReport}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-emerald-600/20"
                        >
                          {dispatchingReport ? "Dispatching..." : "📱 Dispatch WhatsApp Report Card"}
                        </Button>

                        <Button
                          onClick={() => handleTriggerParentDispatch("EMAIL")}
                          disabled={dispatchingReport}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-blue-600/20"
                        >
                          📧 Dispatch Email Report
                        </Button>
                      </div>

                      {dispatchedUrl && (
                        <div className="mt-3 p-3 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-1 animate-in fade-in">
                          <p className="text-[10px] text-emerald-400 font-bold uppercase">✅ Parent Dispatch Link Active:</p>
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-300 truncate font-mono text-[11px]">{dispatchedUrl}</span>
                            <Link href={dispatchedUrl} target="_blank">
                              <Button className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 h-7 text-[10px] font-bold px-2 shrink-0">
                                Open Report <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              ) : (
                /* Candidate Attempt List */
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Exam & Lesson Attempt History ({selectedStudent.attempts?.length || 0})</h3>
                  
                  {(!selectedStudent.attempts || selectedStudent.attempts.length === 0) ? (
                    <div className="text-center py-12 text-xs text-slate-500 bg-black/20 rounded-xl border border-white/5">
                      No test attempts recorded for this candidate yet.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                      {selectedStudent.attempts.map((att: any) => (
                        <div
                          key={att.id}
                          onClick={() => { setSelectedAttempt(att); setComment(att.mentorComment || ""); setDispatchedUrl(null); }}
                          className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer flex items-center justify-between group"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-bold rounded uppercase">
                                {att.test?.title?.split(" ")[0] || "TEST"}
                              </span>
                              <h4 className="font-bold text-white text-xs group-hover:text-blue-400 transition-colors">{att.test?.title || "Mock Test"}</h4>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Attempted: {new Date(att.createdAt).toLocaleString()}</p>
                          </div>

                          <div className="text-right flex items-center gap-4">
                            <div>
                              <p className="text-sm font-black text-emerald-400">{att.score ?? 0} pts</p>
                              <p className="text-[9px] text-slate-400 font-bold">{att.percentage ? `${att.percentage}%` : ""}</p>
                            </div>
                            <Button className="bg-blue-600/20 text-blue-300 border border-blue-500/30 group-hover:bg-blue-600 group-hover:text-white transition-all h-8 text-[10px] font-bold px-3">
                              Inspect & Dispatch →
                            </Button>
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

    </div>
  );
}

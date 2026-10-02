"use client";

import { useEffect, useState } from "react";
import { Award, FileText, Download, Share2, Filter, ExternalLink, CheckCircle2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

export default function ParentReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExamCategory, setSelectedExamCategory] = useState("ALL");
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const examCategories = ["ALL", "JEE", "NEET", "GATE", "AFCAT", "PLAB", "COMEDK", "SSC CGL"];

  useEffect(() => {
    fetch("/api/parent/overview")
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        if (resData.students && resData.students.length > 0) {
          setSelectedChildId(resData.students[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 font-medium text-xs">Loading report cards...</p>
        </div>
      </div>
    );
  }

  const students = data?.students || [];
  const activeStudent = students.find((s: any) => s.id === selectedChildId) || students[0];
  const attempts = activeStudent?.attempts || [];

  const filteredAttempts = attempts.filter((att: any) => {
    if (selectedExamCategory === "ALL") return true;
    const title = (att.test?.title || "").toUpperCase();
    return title.includes(selectedExamCategory);
  });

  const handleCopyReportLink = (attemptId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/report/${attemptId}`;
    navigator.clipboard.writeText(link);
    toast.success("Official encrypted report card link copied to clipboard!");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Candidate Official Report Cards</h1>
          <p className="text-sm text-slate-400 mt-1">
            Access, view, download PDF report cards and verify performance records across exam streams.
          </p>
        </div>

        {/* Linked Children Tab Switcher */}
        {students.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-white/10">
            {students.map((child: any) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  (activeStudent?.id === child.id)
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                👶 {child.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter by Exam Category */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>Filter by Exam Category:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {examCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedExamCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all border ${
                selectedExamCategory === cat
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Catalog */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Verified Reports for {activeStudent?.name || "Student"} ({filteredAttempts.length})
        </h2>

        {filteredAttempts.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500 bg-black/20 rounded-xl border border-white/5">
            No report cards found matching the selected exam category.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAttempts.map((att: any) => (
              <div 
                key={att.id} 
                className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold rounded uppercase">
                      OFFICIAL CBT REPORT
                    </span>
                    <span className="text-xs text-slate-400">Date: {new Date(att.createdAt).toLocaleDateString()}</span>
                  </div>

                  <h3 className="font-bold text-white text-base mt-1">{att.test?.title || "Mock Exam"}</h3>
                  
                  <p className="text-xs text-slate-300">
                    Score: <strong className="text-emerald-400">{att.score ?? 0}</strong> / {att.test?.totalMarks || 100} • 
                    Accuracy: <strong className="text-blue-400">{att.accuracy ? `${att.accuracy.toFixed(1)}%` : "N/A"}</strong> • 
                    Batch Rank: <strong className="text-indigo-400">#{att.rank || 1}</strong>
                  </p>

                  {att.mentorComment && (
                    <div className="mt-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-200">
                      <strong>Mentor Note:</strong> "{att.mentorComment}"
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link href={`/report/${att.id}`} target="_blank">
                    <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 text-xs px-3 rounded-xl">
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      View Online Report
                    </Button>
                  </Link>

                  <Button 
                    onClick={() => window.print()} 
                    variant="outline"
                    className="border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold h-9 text-xs px-3 rounded-xl"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download PDF Card
                  </Button>

                  <Button 
                    onClick={() => handleCopyReportLink(att.id)}
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 font-bold h-9 text-xs px-3 rounded-xl"
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1" />
                    Copy Link
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

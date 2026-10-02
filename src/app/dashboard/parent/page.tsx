"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Share2, 
  TrendingUp, 
  MessageSquare,
  CreditCard,
  Send,
  UserPlus,
  ArrowRight,
  ExternalLink,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ParentDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 font-medium text-sm">Loading parent oversight command center...</p>
        </div>
      </div>
    );
  }

  const students = data?.students || [];
  const activeStudent = students.find((s: any) => s.id === selectedChildId) || students[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PARENT OVERSIGHT PORTAL</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Parent Oversight Command Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Comprehensive oversight for fee payments, test score statements, weak topic diagnostics & extra mock requests.
          </p>
        </div>

        {/* Linked Children Selector */}
        {students.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-white/10">
            {students.map((child: any) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  (activeStudent?.id === child.id)
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>👶</span>
                <span>{child.name}</span>
              </button>
            ))}
            <Link href="/dashboard/parent/children">
              <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold" title="Manage Children">
                +
              </button>
            </Link>
          </div>
        )}
      </div>

      {!activeStudent ? (
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-12 text-center text-slate-400 space-y-4">
          <User className="w-12 h-12 mx-auto text-slate-500" />
          <p className="text-lg font-bold text-white">No Linked Student Accounts Found</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Connect your child's student account to start monitoring exam scores, downloading official report cards, and managing tuition fee payments.
          </p>
          <Link href="/dashboard/parent/children">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-6 rounded-xl text-xs">
              Connect Student Profile Now
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Active Student Info Header Card */}
          <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900/60 p-6 rounded-3xl border border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-black uppercase shadow-lg shadow-blue-500/20">
                {activeStudent.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">{activeStudent.name}</h2>
                <p className="text-xs text-slate-300">{activeStudent.email} • Batch: <strong className="text-blue-400">{activeStudent.batch || "Achievers Batch 2026"}</strong></p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["JEE", "NEET", "AFCAT", "GATE"].map(stream => (
                    <span key={stream} className="px-2 py-0.5 bg-white/10 text-white text-[9px] font-bold rounded uppercase">
                      {stream}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/dashboard/parent/reports">
                <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-4 rounded-xl text-xs shadow-md">
                  View Exam Statements & Reports
                </Button>
              </Link>
              <Link href="/dashboard/parent/payments">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 px-4 rounded-xl text-xs shadow-md">
                  💳 Fee Payments
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link href="/dashboard/parent/reports">
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-white/[0.05] transition-all flex items-center justify-between cursor-pointer group">
                <div className="space-y-1">
                  <Award className="w-5 h-5 text-amber-400" />
                  <p className="text-xs font-bold text-white group-hover:text-blue-400">Exam Reports</p>
                  <p className="text-[10px] text-slate-400">Scorecards & PDF Cards</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </div>
            </Link>

            <Link href="/dashboard/parent/payments">
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-white/[0.05] transition-all flex items-center justify-between cursor-pointer group">
                <div className="space-y-1">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <p className="text-xs font-bold text-white group-hover:text-emerald-400">Fee Payments</p>
                  <p className="text-[10px] text-slate-400">Paid & Pending Invoices</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </div>
            </Link>

            <Link href="/dashboard/parent/requests">
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-white/[0.05] transition-all flex items-center justify-between cursor-pointer group">
                <div className="space-y-1">
                  <Send className="w-5 h-5 text-purple-400" />
                  <p className="text-xs font-bold text-white group-hover:text-purple-400">Request Mocks</p>
                  <p className="text-[10px] text-slate-400">Extra Test Boosters</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </div>
            </Link>

            <Link href="/dashboard/parent/weaknesses">
              <div className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-white/[0.05] transition-all flex items-center justify-between cursor-pointer group">
                <div className="space-y-1">
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                  <p className="text-xs font-bold text-white group-hover:text-rose-400">Weak Topics</p>
                  <p className="text-[10px] text-slate-400">Concept Diagnostics</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </div>
            </Link>
          </div>

          {/* Child Performance KPI Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tests Taken</p>
              <p className="text-3xl font-black text-white mt-1">{activeStudent.totalTestsAttempted || 0}</p>
            </div>

            <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Average Score %</p>
              <p className="text-3xl font-black text-emerald-300 mt-1">{activeStudent.avgScore || 0}%</p>
            </div>

            <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 backdrop-blur-md">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Batch Rank</p>
              <p className="text-3xl font-black text-blue-300 mt-1">#{activeStudent.latestTest?.rank || 1}</p>
            </div>

            <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Accuracy Rate</p>
              <p className="text-3xl font-black text-amber-300 mt-1">{activeStudent.latestTest?.accuracy || 82.5}%</p>
            </div>

          </div>

          {/* Recent Test Statements */}
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Recent Test Statements & Reports for {activeStudent.name}
              </h3>
              <Link href="/dashboard/parent/reports" className="text-xs text-blue-400 hover:text-blue-300 font-bold">
                View All Statements →
              </Link>
            </div>

            {(!activeStudent.attempts || activeStudent.attempts.length === 0) ? (
              <div className="text-center py-12 text-xs text-slate-500 bg-black/20 rounded-xl border border-white/5">
                No exam statements recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {activeStudent.attempts.map((att: any) => (
                  <div key={att.id} className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{att.test?.title || "Mock Attempt"}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Attempted on {new Date(att.createdAt).toLocaleDateString()}</p>
                      {att.mentorComment && (
                        <p className="text-xs text-blue-300 mt-1">Mentor Note: "{att.mentorComment}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-400">{att.score ?? 0} pts</p>
                        <p className="text-[10px] text-slate-400">{att.percentage ? `${att.percentage}%` : ""}</p>
                      </div>
                      <Link href={`/report/${att.id}`} target="_blank">
                        <Button className="bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 h-8 text-xs font-bold px-3">
                          Verified Report Link <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

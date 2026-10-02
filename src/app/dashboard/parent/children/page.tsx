"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus, BookOpen, Award, CheckCircle2, ShieldCheck, Mail, Phone, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

export default function ParentChildrenPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [connecting, setConnecting] = useState(false);

  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/parent/overview");
      if (res.ok) {
        const resData = await res.json();
        setData(resData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleConnectStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    try {
      const res = await fetch("/api/parent/link-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentEmail, studentPhone })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success(resData.message);
        setShowConnectModal(false);
        setStudentEmail("");
        setStudentPhone("");
        fetchOverview();
      } else {
        toast.error(resData.error || "Failed to link student account");
      }
    } catch (err) {
      toast.error("Error linking student account");
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 font-medium text-xs">Loading linked student profiles...</p>
        </div>
      </div>
    );
  }

  const students = data?.students || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Linked Candidates & Student Profiles</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your linked children accounts, review target exam goals, and request new student linkage.
          </p>
        </div>

        <Button
          onClick={() => setShowConnectModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-5 rounded-xl shadow-lg shadow-blue-600/30 text-xs flex items-center justify-center gap-2 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Connect New Student Account</span>
        </Button>
      </div>

      {/* Children Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {students.map((student: any) => (
          <div
            key={student.id}
            className="p-6 bg-slate-900/60 border border-white/10 rounded-3xl space-y-5 hover:border-blue-500/30 transition-all shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-black uppercase shadow-lg shadow-blue-500/20">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">{student.name}</h3>
                  <p className="text-xs text-slate-400">{student.email}</p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold rounded uppercase">
                    {student.batch || "Achievers Batch 2026"}
                  </span>
                </div>
              </div>

              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded-full uppercase">
                ✓ ACTIVE LINK
              </span>
            </div>

            {/* Performance KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Tests Taken</span>
                <p className="text-lg font-black text-white mt-0.5">{student.totalTestsAttempted || 0}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Avg Score</span>
                <p className="text-lg font-black text-emerald-400 mt-0.5">{student.avgScore || 0}%</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Batch Rank</span>
                <p className="text-lg font-black text-indigo-400 mt-0.5">#{student.latestTest?.rank || 1}</p>
              </div>
            </div>

            {/* Weak Topics Quick List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase block">Weak Concept Focus:</span>
              <div className="flex flex-wrap gap-1.5">
                {student.weakTopics?.map((topic: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-semibold rounded-lg">
                    ⚠ {topic}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <Link href="/dashboard/parent/reports">
                <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 text-xs px-4 rounded-xl">
                  Inspect Scorecards & Statements →
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* CONNECT NEW STUDENT MODAL */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                Connect Student Account
              </h3>
              <button onClick={() => setShowConnectModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your child's registered student email address or phone number to connect their profile to your parent oversight portal.
            </p>

            <form onSubmit={handleConnectStudent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 uppercase block">Student Email Address</label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="student@astra.com or student@apex.com"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 uppercase block">Or Student Mobile Number</label>
                <input
                  type="text"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  placeholder="+91 98765 43211"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConnectModal(false)}
                  className="border-white/10 text-xs text-slate-300 h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={connecting}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-lg shadow-blue-600/30"
                >
                  {connecting ? "Connecting..." : "Connect Student Profile"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

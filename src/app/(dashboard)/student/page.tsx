"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { OnboardingModal } from "@/components/student/OnboardingModal";
import { 
  FileText, 
  Target, 
  Trophy, 
  TrendingUp, 
  Clock, 
  BookOpen, 
  Sparkles, 
  ChevronRight, 
  Play, 
  MessageSquare, 
  Send, 
  Calendar, 
  FileCheck, 
  Layers, 
  Download, 
  Award,
  BarChart2,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  FolderDown
} from "lucide-react";

export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({ averageScore: 0, testsCompleted: 0, upcomingTests: 0, bestScore: 0, improvement: 0 });
  const [tests, setTests] = useState<any[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [subjectTab, setSubjectTab] = useState<"overall" | "math" | "phy" | "chem">("overall");
  const [analysisFilter, setAnalysisFilter] = useState<"all" | "last5" | "last3">("all");
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [studentTrack, setStudentTrack] = useState({
    selectedClass: "Class 12",
    selectedStream: "Science",
    selectedTrack: "PCM (Maths)"
  });

  const fetchData = async () => {
    try {
      const [analyticsRes, testsRes, attemptsRes] = await Promise.all([
        fetch("/api/analytics/student"),
        fetch("/api/tests"),
        fetch("/api/attempts/history")
      ]);
      
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(prev => ({ ...prev, ...data }));
      }
      
      if (testsRes.ok) {
        const data = await testsRes.json();
        setTests(data);
      }

      if (attemptsRes.ok) {
        const attempts = await attemptsRes.json();
        if (Array.isArray(attempts)) {
          setRecentAttempts(attempts.slice(0, 5));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Check if track is saved in localStorage
    const savedTrack = localStorage.getItem("student_track_prefs");
    if (savedTrack) {
      try {
        setStudentTrack(JSON.parse(savedTrack));
      } catch (e) {}
    } else {
      // Show onboarding on first load
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = (data: { selectedClass: string; selectedStream: string; selectedTrack: string }) => {
    setStudentTrack(data);
    localStorage.setItem("student_track_prefs", JSON.stringify(data));
    setShowOnboarding(false);
    toast.success(`Track set to ${data.selectedClass} - ${data.selectedTrack}`);
  };

  const handleStartExam = async (testId: string) => {
    try {
      const res = await fetch("/api/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId }),
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success("Exam loaded. Initializing exam interface...");
        router.push(`/exam/${data.attemptId}`);
      } else {
        toast.error("Failed to start exam");
      }
    } catch (err) {
      toast.error("Error starting exam");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 font-medium text-sm">Loading your Mock Test Club dashboard...</p>
        </div>
      </div>
    );
  }

  // Free practice tests from API or mock placeholders
  const freePracticeExams = tests.length > 0 ? tests.slice(0, 6) : [
    { id: "mock-1", title: "Chapter Test-12 (General Organic Chemistry)", duration: 60, totalQuestions: 25 },
    { id: "mock-2", title: "Chapter Test-19 (Chemical Kinetics)", duration: 60, totalQuestions: 25 },
    { id: "mock-3", title: "Chapter Test-20 (Ray Optics)", duration: 60, totalQuestions: 23 },
    { id: "mock-4", title: "Chapter Test-9 (Redox Reaction)", duration: 60, totalQuestions: 25 },
    { id: "mock-5", title: "Chapter Test-15 (Alternating Current & EM Waves)", duration: 60, totalQuestions: 25 },
    { id: "mock-6", title: "Chapter Test-04 (Haloalkanes and Haloarenes)", duration: 60, totalQuestions: 25 },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Onboarding Wizard Modal */}
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={handleOnboardingComplete} 
      />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-white">
              {studentTrack.selectedTrack.includes("PCM") ? "JEE Preparation" : studentTrack.selectedTrack.includes("PCB") ? "NEET Preparation" : "Competitive Exam Preparation"}
            </h1>
            <button 
              onClick={() => setShowOnboarding(true)}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4"
            >
              Change Stream
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold rounded-md">
              {studentTrack.selectedClass}
            </span>
            <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold rounded-md">
              {studentTrack.selectedTrack}
            </span>
          </div>
        </div>

        {/* Quick Actions Header Toolbar */}
        <div className="flex items-center gap-3">
          <Link href="/student/buy-exams">
            <Button variant="outline" className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 text-xs font-bold h-10 rounded-xl">
              Browse Packages
            </Button>
          </Link>
          <Link href="/student/practice">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold h-10 px-5 rounded-xl shadow-lg shadow-blue-600/30">
              Practice Mode
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        
        {/* Total Exams */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md flex items-center justify-between group hover:border-blue-500/30 transition-all">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Exams</p>
            <p className="text-3xl md:text-4xl font-black text-white mt-1">{analytics.testsCompleted}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md flex items-center justify-between group hover:border-emerald-500/30 transition-all">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Score</p>
            <p className="text-3xl md:text-4xl font-black text-emerald-400 mt-1">{analytics.averageScore}%</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Target className="w-6 h-6" />
          </div>
        </div>

        {/* Best Score */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md flex items-center justify-between group hover:border-amber-500/30 transition-all">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Best Score</p>
            <p className="text-3xl md:text-4xl font-black text-amber-400 mt-1">{analytics.bestScore || analytics.averageScore}%</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        {/* Improvement */}
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md flex items-center justify-between group hover:border-indigo-500/30 transition-all">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Improvement</p>
            <p className="text-3xl md:text-4xl font-black text-indigo-400 mt-1">+{analytics.improvement}%</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main Grid: Free Exams To Practice & Recent Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 cols): Free Exams To Practice */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Free Exams To Practice
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Published exams ready to take immediately</p>
            </div>
            <Link href="/student/mocks" className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {freePracticeExams.map((exam: any) => (
              <div 
                key={exam.id} 
                className="p-4 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md hover:bg-slate-900/90 hover:border-blue-500/30 transition-all flex items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-200 text-sm md:text-base group-hover:text-white transition-colors">
                    {exam.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {exam.duration || 60} min
                    </span>
                    <span className="flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5 text-slate-500" />
                      {exam.totalQuestions || exam.questions?.length || 25} questions
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => handleStartExam(exam.id)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-5 rounded-xl shadow-lg shadow-blue-600/20 shrink-0 flex items-center gap-2 text-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (1 col): Recent Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                Recent Results
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Your latest exam attempts</p>
            </div>
            <Link href="/student/history" className="text-xs text-blue-400 hover:text-blue-300 font-bold">
              History
            </Link>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 min-h-[300px] flex flex-col justify-center items-center text-center">
            {recentAttempts.length === 0 ? (
              <div className="space-y-3 py-8">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                  <Trophy className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-400">No attempts yet</p>
                <p className="text-xs text-slate-500 max-w-xs">Start taking practice tests to view your detailed performance breakdown here.</p>
                <Link href="/student/practice">
                  <Button className="bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 text-xs font-bold h-9 px-4 rounded-xl mt-2">
                    Take an Exam
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="w-full space-y-3">
                {recentAttempts.map((attempt: any) => (
                  <Link key={attempt.id} href={`/report/${attempt.id}`}>
                    <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all text-left flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-200 truncate">{attempt.test?.title || "Mock Attempt"}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(attempt.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-blue-400">{attempt.percentage ? `${attempt.percentage}%` : "Completed"}</p>
                        <p className="text-[10px] text-slate-400">{attempt.score || 0} marks</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Section: Score & Predicted Percentile Chart */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Score and Predicted Percentile for MTC-FTs & PYQs
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">This graph shows how you performed in the MTC-FTs and PYQs you attempted</p>
          </div>

          {/* Subject Tabs */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
            {[
              { id: "overall", label: "Overall" },
              { id: "math", label: "Math" },
              { id: "phy", label: "Phy" },
              { id: "chem", label: "Chem" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSubjectTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  subjectTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Graph Placeholder */}
        <div className="min-h-[220px] flex flex-col items-center justify-center text-center p-8 bg-black/20 rounded-xl border border-white/5">
          <TrendingUp className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-sm font-semibold text-slate-400">No performance data yet</p>
          <p className="text-xs text-slate-500 max-w-sm mt-1">Complete full-length mock tests to view your predicted percentile graph and subject trendlines.</p>
        </div>
      </div>

      {/* Section: Quick Analysis */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-purple-400" />
              Quick Analysis
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {[
              { id: "all", label: "All Tests" },
              { id: "last5", label: "Last 5 Tests" },
              { id: "last3", label: "Last 3 Tests" },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setAnalysisFilter(filter.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  analysisFilter === filter.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-center py-6 text-xs text-slate-500 bg-black/20 rounded-xl border border-white/5">
          Attempt tests to see your subject-wise accuracy and speed analytics.
        </div>
      </div>

      {/* Section: PYQs as Mock Tests */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-400" />
          PYQs as Mock Tests
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { year: "2026", title: "JEE Main 2026 PYQs", count: "20 Tests", color: "from-blue-600/20 to-indigo-600/20 border-blue-500/30" },
            { year: "2025", title: "JEE Main 2025 PYQs", count: "12 Tests", color: "from-purple-600/20 to-pink-600/20 border-purple-500/30" },
            { year: "2024", title: "JEE Main 2024 PYQs", count: "28 Tests", color: "from-emerald-600/20 to-teal-600/20 border-emerald-500/30" },
            { year: "2023-2021", title: "JEE Main 2023-2021 PYQs", count: "72 Tests", color: "from-amber-600/20 to-orange-600/20 border-amber-500/30" },
          ].map((pyq, i) => (
            <Link key={i} href="/student/mocks">
              <div className={`p-5 rounded-2xl border bg-gradient-to-br ${pyq.color} backdrop-blur-md hover:scale-[1.02] transition-all cursor-pointer`}>
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white mb-3">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-slate-200 text-sm">{pyq.title}</h4>
                <p className="text-xs text-slate-400 mt-1">{pyq.count}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Section: Resources Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <FolderDown className="w-5 h-5 text-emerald-400" />
          Study Resources & Downloads
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { title: "Mentorship Sessions", icon: MessageSquare, href: "/student/messages" },
            { title: "Telegram Channel", icon: Send, href: "#" },
            { title: "Test Schedule", icon: Calendar, href: "/student/documents" },
            { title: "Formula Sheets", icon: FileCheck, href: "/student/documents" },
            { title: "Revision Notes", icon: BookOpen, href: "/student/documents" },
            { title: "Important PDFs", icon: Download, href: "/student/documents" },
          ].map((res, i) => {
            const Icon = res.icon;
            return (
              <Link key={i} href={res.href}>
                <div className="p-4 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-900/90 hover:border-blue-500/30 transition-all text-center group cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-300 group-hover:text-white leading-tight">{res.title}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}

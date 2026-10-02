"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { TestReview } from "@/components/student/TestReview";
import { 
  CheckCircle2, 
  Clock, 
  Send, 
  Target, 
  Sparkles, 
  ShieldCheck, 
  Bookmark, 
  Award,
  BookOpen,
  X
} from "lucide-react";
import { toast } from "sonner";

export default function MockTestsPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [isWithinWindow, setIsWithinWindow] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  
  // Registered Exam Streams state
  const [registeredExams, setRegisteredExams] = useState<string[]>([
    "JEE", "NEET", "AFCAT", "GATE", "PLAB", "COMEDK"
  ]);

  // Remote test request modal state
  const [showRemoteRequestModal, setShowRemoteRequestModal] = useState(false);
  const [requestExamCategory, setRequestExamCategory] = useState("AFCAT");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestCount, setRequestCount] = useState(3);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const router = useRouter();

  const allExamStreams = ["JEE", "NEET", "AFCAT", "GATE", "PLAB", "COMEDK", "SSC CGL"];

  const toggleRegisteredExam = (stream: string) => {
    if (registeredExams.includes(stream)) {
      setRegisteredExams(registeredExams.filter(e => e !== stream));
      toast.info(`Removed ${stream} from active registered goals`);
    } else {
      setRegisteredExams([...registeredExams, stream]);
      toast.success(`Registered for ${stream} exam stream!`);
    }
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
        router.push(`/exam/${data.attemptId}`);
      } else {
        toast.error("Failed to start exam");
      }
    } catch (err) {
      toast.error("Error starting exam");
    }
  };

  const handleSubmitRemoteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRequest(true);
    try {
      const res = await fetch("/api/student/remote-test-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examCategory: requestExamCategory,
          count: requestCount,
          notes: requestNotes,
          category: "MOCK"
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Remote proctored test request submitted! Your mentor will review & schedule your test link.");
        setShowRemoteRequestModal(false);
        setRequestNotes("");
      } else {
        toast.error("Failed to submit remote test request");
      }
    } catch (err) {
      toast.error("Error submitting remote test request");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const fetchTests = async () => {
    try {
      const res = await fetch("/api/tests?type=MOCK");
      const data = await res.json();
      setTests(data);
    } catch (err) {
      console.error("Failed to fetch mock tests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
    
    // Check time every second
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeInMinutes = hours * 60 + minutes;
      
      const startMinutes = 15 * 60 + 30; // 15:30
      const endMinutes = 18 * 60 + 30;   // 18:30
      
      setIsWithinWindow(timeInMinutes >= startMinutes && timeInMinutes <= endMinutes);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (reviewId) {
    return (
      <div className="max-w-6xl mx-auto p-4 animate-fade-in-up">
        <TestReview attemptId={reviewId} onClose={() => setReviewId(null)} />
      </div>
    );
  }

  // Filter tests by active registered exam streams
  const filteredTests = tests.filter(test => {
    if (activeFilter === "ALL") {
      return registeredExams.some(stream => test.title.toUpperCase().includes(stream));
    }
    return test.title.toUpperCase().includes(activeFilter);
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Top Banner Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-blue-500/30 backdrop-blur-2xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>OFFICIAL CBT & REMOTE TEST HUB</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Available Mock Exams & Remote Tests
          </h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Register for target exams (AFCAT, GATE, NEET, JEE, PLAB, COMEDK), request remote proctored tests, and take timed CBT mocks.
          </p>
        </div>

        {/* Actions & Live Status */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full md:w-auto">
          
          <Button
            onClick={() => setShowRemoteRequestModal(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-11 px-5 rounded-2xl shadow-lg shadow-emerald-600/30 text-xs flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Request Remote Test</span>
          </Button>

          <div className={`p-4 rounded-2xl border backdrop-blur-md ${isWithinWindow ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.25)]' : 'bg-amber-950/50 border-amber-500/30 text-amber-300'}`}>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isWithinWindow ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isWithinWindow ? "WINDOW ACTIVE" : "STANDARD MOCK MODE"}
              </span>
            </div>
            <p className="text-[11px] mt-1 font-mono font-bold">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Voluntary Exam Streams Goal Registration Selector */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            Voluntary Exam Goal Registration
          </h3>
          <span className="text-[10px] text-slate-400">Click to register / unregister exam streams</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {allExamStreams.map((stream) => {
            const isRegistered = registeredExams.includes(stream);
            return (
              <button
                key={stream}
                onClick={() => toggleRegisteredExam(stream)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  isRegistered
                    ? 'bg-blue-600/30 border-blue-500/50 text-blue-300 shadow-md'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{isRegistered ? "✓" : "+"}</span>
                <span>{stream}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
        {["ALL", ...registeredExams].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeFilter === filter
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "bg-slate-900/60 text-slate-400 hover:text-white border border-white/5"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-56 bg-slate-900/60 rounded-3xl border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="p-16 text-center bg-slate-900/40 border border-white/10 rounded-3xl space-y-3">
          <BookOpen className="w-10 h-10 mx-auto text-slate-500" />
          <h3 className="text-lg font-bold text-white">No Mock Exams Found for Selected Filters</h3>
          <p className="text-slate-400 text-xs">Try selecting a different registered exam goal above or submit a remote test request.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTests.map((test) => {
            const completedAttempt = test.attempts?.find((a: any) => a.status === 'COMPLETED');
            const inProgressAttempt = test.attempts?.find((a: any) => a.status === 'IN_PROGRESS');

            return (
              <div
                key={test.id}
                className="p-8 bg-slate-900/60 border border-white/10 rounded-3xl hover:border-blue-500/40 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between shadow-xl"
              >
                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-extrabold uppercase tracking-widest">
                      FULL LENGTH MOCK
                    </span>
                    {completedAttempt ? (
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase rounded-full">
                        ✓ COMPLETED
                      </span>
                    ) : inProgressAttempt ? (
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold uppercase rounded-full animate-pulse">
                        ⏳ IN PROGRESS
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-800 text-slate-400 text-[10px] font-extrabold uppercase rounded-full">
                        READY
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors leading-tight">
                      {test.title}
                    </h3>
                    <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                      {test.description || "Official CBT Mock Exam simulating actual exam conditions with instant diagnostic analytics and parent dispatch link."}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs font-semibold text-slate-300 pt-2">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center text-center">
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Duration</span>
                      <span className="font-bold text-white mt-0.5">⏱ {test.duration} Mins</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center text-center">
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Total Marks</span>
                      <span className="font-bold text-white mt-0.5">💯 {test.totalMarks}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center text-center">
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Questions</span>
                      <span className="font-bold text-white mt-0.5">❓ {test.questions?.length || "180"}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10 relative z-10 flex gap-4">
                  {completedAttempt ? (
                    <Button
                      className="w-full h-12 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/10 text-xs"
                      onClick={() => setReviewId(completedAttempt.id)}
                    >
                      📊 Review Score & Solution Key
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleStartExam(test.id)}
                      className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                    >
                      🚀 Start CBT Mock Exam
                    </Button>
                  )}
                </div>

                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
              </div>
            );
          })}
        </div>
      )}

      {/* REMOTE TEST REQUEST MODAL */}
      {showRemoteRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-400" />
                Request Remote Proctored Test
              </h3>
              <button 
                onClick={() => setShowRemoteRequestModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRemoteRequest} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1">Target Exam Category</label>
                <select
                  value={requestExamCategory}
                  onChange={(e) => setRequestExamCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500"
                >
                  {allExamStreams.map(s => (
                    <option key={s} value={s}>{s} Exam Stream</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1">Number of Test Sets Requested</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={requestCount}
                  onChange={(e) => setRequestCount(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase block mb-1">Preferred Date, Time & Topic Focus</label>
                <textarea
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="E.g., Requesting a proctored mock on Sunday 10 AM covering Physics Kinematics & Chemistry Kinetics..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500 min-h-[90px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRemoteRequestModal(false)}
                  className="border-white/10 text-xs text-slate-300 h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingRequest}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-emerald-600/20"
                >
                  {submittingRequest ? "Submitting..." : "Submit Remote Request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

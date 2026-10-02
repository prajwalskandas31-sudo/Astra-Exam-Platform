import { verifyReportToken } from "@/lib/reportTokens";
import { prisma } from "@/lib/prisma";
import { CheckCircle, XCircle, Award, Target, Clock, AlertTriangle } from "lucide-react";

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = verifyReportToken(token);

  if (!payload) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 p-8 rounded-2xl text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-2xl font-bold text-red-400">Invalid or Expired Link</h1>
          <p className="text-slate-300 text-xs">This report link is invalid or has expired. Please request a new report link.</p>
        </div>
      </div>
    );
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: payload.attemptId },
    include: {
      user: true,
      test: true,
      answers: {
        include: { question: true }
      }
    }
  });

  if (!attempt) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-red-400">Report Not Found</h1>
        </div>
      </div>
    );
  }

  const subjectScores = attempt.subjectScores ? JSON.parse(attempt.subjectScores) : {};
  const weakTopics = attempt.weakTopics ? JSON.parse(attempt.weakTopics) : [];
  const strongTopics = attempt.strongTopics ? JSON.parse(attempt.strongTopics) : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 md:px-12 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            A
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-sm">Apex Competitive Coaching</h1>
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Verified Official Performance Report</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-4xl w-full mx-auto space-y-8">
        {/* Title Header */}
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
            <div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Student Report</span>
              <h1 className="text-2xl font-extrabold text-slate-100 mt-1">{attempt.test.title}</h1>
              <p className="text-xs text-slate-400 mt-1">Student: <strong>{attempt.user.name}</strong> • Test Date: {new Date(attempt.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-left md:text-right bg-blue-500/10 border border-blue-500/20 px-5 py-3 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Overall Score</span>
              <div className="text-2xl font-black text-emerald-400">
                {Math.round((attempt.score || 0) * 10) / 10} <span className="text-xs font-normal text-slate-400">/ {attempt.test.totalMarks}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Accuracy</span>
              <p className="text-lg font-bold text-blue-400">{Math.round((attempt.accuracy || 0) * 10) / 10}%</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Batch Rank</span>
              <p className="text-lg font-bold text-indigo-400">Rank #{attempt.rank || 1}</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Correct Answers</span>
              <p className="text-lg font-bold text-emerald-400">{attempt.correctCount}</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Incorrect</span>
              <p className="text-lg font-bold text-red-400">{attempt.incorrectCount}</p>
            </div>
          </div>
        </div>

        {/* Subject Breakdown */}
        <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl space-y-6">
          <h2 className="text-lg font-bold text-slate-200">Subject Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(subjectScores).map(([subj, data]: [string, any]) => (
              <div key={subj} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 block">{subj}</span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Score:</span>
                  <strong className="text-emerald-400">{data.score} / {data.maxScore}</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Accuracy:</span>
                  <strong className="text-blue-400">{data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0}%</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strong vs Weak Topics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Strong Topics
            </h3>
            {strongTopics.length > 0 ? (
              <div className="space-y-2">
                {strongTopics.map((top: string, idx: number) => (
                  <div key={idx} className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg font-medium">
                    ✓ {top}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No strong topics recorded yet.</p>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Topics Needing Improvement
            </h3>
            {weakTopics.length > 0 ? (
              <div className="space-y-2">
                {weakTopics.map((top: string, idx: number) => (
                  <div key={idx} className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-lg font-medium">
                    ⚠ {top}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Great job! No weak topics detected.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

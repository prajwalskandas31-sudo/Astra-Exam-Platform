"use client";

import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { TestReview } from "@/components/student/TestReview";

export default function ResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = use(params);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch(`/api/attempts/${attemptId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        // Count correct answers
        const correctCount = data.answers.filter((a: any) => a.isCorrect).length;
        const total = data.test.questions.length;
        
        setResults({
          score: data.score ? Math.round(data.score) : Math.round((correctCount / total) * 100),
          correctCount,
          total,
          timeTaken: data.endTime ? `${Math.floor((new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 60000)}m` : "Unknown",
          weakTopics: [] // Could be calculated based on subject tags of incorrect answers
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchResults();
  }, [attemptId]);

  const [showDetailedReview, setShowDetailedReview] = useState(false);

  if (!results) return <div>Loading results...</div>;

  if (showDetailedReview) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-5xl mx-auto">
          <TestReview attemptId={attemptId} onClose={() => setShowDetailedReview(false)} />
        </div>
      </div>
    );
  }

  const isPassed = results.score >= 50;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl text-center space-y-8 relative overflow-hidden">
          {/* Decorative background blur */}
          <div className={`absolute -top-24 -right-24 w-64 h-64 blur-[100px] rounded-full opacity-20 ${isPassed ? 'bg-emerald-500' : 'bg-red-500'}`} />
          
          <div className="relative z-10 space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-white">Exam Analysis</h1>
            <p className="text-slate-400">Attempt ID: <span className="font-mono text-xs">{attemptId}</span></p>
          </div>
          
          <div className="relative z-10 flex flex-col items-center justify-center py-8">
            <div className={`text-8xl font-black mb-2 ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
              {results.score}%
            </div>
            <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${isPassed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {isPassed ? "Successful Attempt" : "Needs Improvement"}
            </div>
          </div>
          
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6 py-10 border-y border-white/10">
            <div className="space-y-1">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Correct</p>
              <p className="text-2xl font-bold text-white">{results.correctCount} <span className="text-slate-500 text-sm font-normal">/ {results.total}</span></p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Time Taken</p>
              <p className="text-2xl font-bold text-white">{results.timeTaken}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Accuracy</p>
              <p className="text-2xl font-bold text-white">{results.score}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Outcome</p>
              <p className={`text-2xl font-bold ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPassed ? "Passed" : "Failed"}
              </p>
            </div>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              className="h-12 px-8 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20" 
              size="lg" 
              onClick={() => window.location.href = '/student'}
            >
              Return to Dashboard
            </Button>
            <Button 
              variant="outline"
              className="h-12 px-8 border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl" 
              size="lg" 
              onClick={() => setShowDetailedReview(true)}
            >
              Review Detailed Answers
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

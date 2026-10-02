"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface TestReviewProps {
  attemptId: string;
  onClose: () => void;
}

export function TestReview({ attemptId, onClose }: TestReviewProps) {
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttempt = async () => {
      try {
        const res = await fetch(`/api/attempts/${attemptId}`);
        const data = await res.json();
        setAttempt(data);
      } catch (err) {
        console.error("Failed to fetch attempt", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttempt();
  }, [attemptId]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading review...</div>;
  if (!attempt) return <div className="p-8 text-center text-red-400">Failed to load attempt details.</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-start border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{attempt.test.title} - Detailed Review</h2>
          <p className="text-slate-400 mt-1">Score: {attempt.score} / {attempt.test.totalMarks} • Taken on {new Date(attempt.createdAt).toLocaleDateString()}</p>
        </div>
        <Button variant="outline" onClick={onClose} className="border-slate-700 hover:bg-slate-800 text-white">Exit Review</Button>
      </div>

      {attempt.mentorComment && (
        <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Mentor Feedback</p>
          <p className="text-slate-200 whitespace-pre-wrap">{attempt.mentorComment}</p>
        </div>
      )}

      <div className="space-y-6">
        {attempt.test.questions.map((tq: any, index: number) => {
          const question = tq.question;
          const answer = attempt.answers.find((a: any) => a.questionId === question.id);
          
          let options = [];
          try {
            options = typeof question.options === 'string' 
              ? JSON.parse(question.options) 
              : question.options;
          } catch (e) {
            console.error("Failed to parse options for question", question.id);
          }

          const isUnanswered = !answer || !answer.selectedOpt;
          const isCorrect = answer?.isCorrect;

          return (
            <div key={question.id} className={`p-6 rounded-2xl border ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : isUnanswered ? 'bg-slate-500/5 border-slate-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Question {index + 1}</span>
                  <p className="text-lg text-slate-100 font-medium">{question.text}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${isCorrect ? 'bg-emerald-500/20 text-emerald-400' : isUnanswered ? 'bg-slate-500/20 text-slate-400' : 'bg-red-500/20 text-red-400'}`}>
                  {isCorrect ? 'Correct' : isUnanswered ? 'Unanswered' : 'Incorrect'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {Array.isArray(options) && options.map((opt: any, optIdx: number) => {
                  const isSelected = opt.id === answer?.selectedOpt;
                  const isCorrectOpt = opt.id === question.correctOption;
                  
                  let statusClass = "bg-white/[0.02] border-white/5 text-slate-400";
                  if (isSelected && isCorrectOpt) statusClass = "bg-emerald-500/20 border-emerald-500/40 text-emerald-300";
                  else if (isSelected && !isCorrectOpt) statusClass = "bg-red-500/20 border-red-500/40 text-red-300";
                  else if (isCorrectOpt) statusClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400/80";

                  return (
                    <div key={`${question.id}-${opt.id}-${optIdx}`} className={`p-4 rounded-xl border flex gap-3 ${statusClass}`}>
                      <span className="font-bold">{opt.id}.</span>
                      <span className="text-sm">{opt.text}</span>
                    </div>
                  );
                })}
              </div>

              {question.explanation && (
                <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Explanation</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{question.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

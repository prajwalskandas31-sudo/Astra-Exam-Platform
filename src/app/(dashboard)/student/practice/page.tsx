"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Target, Play, ShieldAlert, CheckCircle2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function PracticeModePage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [classGrade, setClassGrade] = useState("");
  const [chapter, setChapter] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [loading, setLoading] = useState(false);

  const subjects = ["Physics", "Chemistry", "Mathematics", "Biology"];
  const classes = ["Class 11", "Class 12", "Dropper"];

  const chaptersMap: Record<string, string[]> = {
    Physics: ["Kinematics", "Laws of Motion", "Work Power Energy", "Ray Optics", "Chemical Kinetics", "Electromagnetism"],
    Chemistry: ["General Organic Chemistry", "Chemical Bonding", "Thermodynamics", "Redox Reaction", "Electrochemistry"],
    Mathematics: ["Calculus", "Vectors & 3D", "Algebra", "Trigonometry", "Coordinate Geometry"],
    Biology: ["Cell Biology", "Genetics & Evolution", "Human Physiology", "Plant Physiology"],
  };

  const handleStartPractice = async () => {
    if (!subject || !classGrade || !chapter) {
      toast.error("Please select Subject, Class, and Chapter/Topic before starting.");
      return;
    }

    setLoading(true);
    try {
      // Create practice test attempt
      const res = await fetch("/api/attempts/retest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "PRACTICE", subject, chapter }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Practice session started!");
        router.push(`/exam/${data.attemptId}`);
      } else {
        toast.error("Failed to generate practice test.");
      }
    } catch (err) {
      toast.error("Error launching practice mode.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold rounded-md">
            Class 12
          </span>
          <span className="px-2.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold rounded-md">
            Science (PCM)
          </span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mt-2">Practice Mode</h1>
        <p className="text-sm text-slate-400">Master individual topics with instant solution feedback and targeted problem sets</p>
      </div>

      <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 border-b border-white/10 pb-4">
          <Target className="w-5 h-5 text-blue-400" />
          Chapter-wise Practice
        </h2>

        {/* Dynamic Cascaded Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* 1. Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Subject</label>
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setChapter("");
                setSubtopic("");
              }}
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 2. Class / Grade */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Class / Grade</label>
            <select
              value={classGrade}
              onChange={(e) => setClassGrade(e.target.value)}
              disabled={!subject}
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none disabled:opacity-50"
            >
              <option value="">{subject ? "Select class" : "Select subject first"}</option>
              {classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 3. Chapter / Topic */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Chapter / Topic</label>
            <select
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              disabled={!classGrade}
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none disabled:opacity-50"
            >
              <option value="">{classGrade ? "Select chapter" : "Select class first"}</option>
              {subject && chaptersMap[subject]?.map((ch) => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>

          {/* 4. Subtopic */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Subtopic</label>
            <select
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
              disabled={!chapter}
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none disabled:opacity-50"
            >
              <option value="">{chapter ? "All Subtopics" : "Select chapter first"}</option>
              <option value="All">All Subtopics</option>
              <option value="Basics">Basic Concepts & Formulas</option>
              <option value="Advanced">Advanced Problem Solving</option>
            </select>
          </div>

        </div>

        {/* Validation error hints */}
        {(!subject || !classGrade || !chapter) && (
          <div className="text-xs text-rose-400 space-y-1 font-semibold pl-1">
            {!subject && <p>• Please select Subject</p>}
            {!classGrade && <p>• Please select Class</p>}
            {!chapter && <p>• Please select Chapter/Topic</p>}
          </div>
        )}

        {/* Start Practice Button */}
        <Button
          onClick={handleStartPractice}
          disabled={loading || !subject || !classGrade || !chapter}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold h-12 px-8 rounded-2xl shadow-xl shadow-blue-600/30 text-xs flex items-center gap-2 disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-current" />
          {loading ? "Initializing..." : "Start Practice (25 Questions)"}
        </Button>

        {/* Reservation Notice */}
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            Adaptive Practice Guarantee
          </p>
          <p className="text-slate-400">
            Questions used in practice mode are permanently reserved for this student and will never appear in exams or mock tests. Practice sessions are saved automatically. You can resume anytime.
          </p>
        </div>

      </div>

    </div>
  );
}

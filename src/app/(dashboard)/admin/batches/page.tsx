"use client";

import { useState } from "react";
import { Layers, Plus, Users, BookOpen, Target, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminBatchesPage() {
  const [batchName, setBatchName] = useState("");
  const [examCategory, setExamCategory] = useState("JEE");

  const batches = [
    { id: "b-1", name: "JEE 2026 Batch A", category: "JEE", students: 42, mentor: "Dr. Rajesh Sharma" },
    { id: "b-2", name: "NEET Achievers 2026", category: "NEET", students: 38, mentor: "Dr. Ananya Roy" },
    { id: "b-3", name: "COMEDK FastTrack", category: "COMEDK", students: 25, mentor: "Faculty Team" },
  ];

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName) return;
    toast.success(`Batch '${batchName}' created successfully!`);
    setBatchName("");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Batch Management</h1>
        <p className="text-sm text-slate-400 mt-1">Organize students into target exam cohorts and assign faculty leads</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Batch Form (1 col) */}
        <form onSubmit={handleCreateBatch} className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4 h-fit">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Plus className="w-4 h-4 text-blue-400" />
            Create New Batch
          </h2>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Batch Name</label>
            <input 
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g. JEE Main 2027 Dropper Batch"
              required
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Target Exam Category</label>
            <select
              value={examCategory}
              onChange={(e) => setExamCategory(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
            >
              <option value="JEE">JEE Main & Advanced</option>
              <option value="NEET">NEET (UG)</option>
              <option value="GATE">GATE CBT</option>
              <option value="AFCAT">AFCAT CBT</option>
              <option value="COMEDK">COMEDK UGET</option>
            </select>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 text-xs rounded-xl shadow-lg shadow-blue-600/30">
            Create Batch
          </Button>
        </form>

        {/* Batches List (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Layers className="w-4 h-4 text-emerald-400" />
            Active Coaching Batches ({batches.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {batches.map((b) => (
              <div key={b.id} className="p-5 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold rounded uppercase">
                    {b.category}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{b.students} Students</span>
                </div>
                <h3 className="font-bold text-white text-base">{b.name}</h3>
                <p className="text-xs text-slate-400">Mentor Lead: <strong className="text-slate-300">{b.mentor}</strong></p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

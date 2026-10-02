"use client";

import { useState } from "react";
import { FolderDown, Upload, FileText, CheckCircle2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function MentorDocumentsPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Formula Sheets");
  const [subject, setSubject] = useState("Physics");
  const [uploading, setUploading] = useState(false);

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setUploading(true);
    setTimeout(() => {
      toast.success(`Resource '${title}' uploaded to ${category} section successfully!`);
      setTitle("");
      setUploading(false);
    }, 800);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Study Material & Resources</h1>
        <p className="text-sm text-slate-400 mt-1">Upload formula sheets, revision notes, important PDFs, and syllabus schedules for students</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Form (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 border-b border-white/10 pb-4">
            <Upload className="w-5 h-5 text-emerald-400" />
            Upload New Resource Document
          </h2>

          <form onSubmit={handleUpload} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Document Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Physics Formula Sheet - Electromagnetism & Ray Optics"
                required
                className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
                >
                  <option value="Formula Sheets">Formula Sheets</option>
                  <option value="Revision Notes">Revision Notes</option>
                  <option value="Important PDFs">Important PDFs</option>
                  <option value="Syllabus & Schedule">Syllabus & Schedule</option>
                  <option value="Practice Sets">Practice Sets</option>
                  <option value="Tips & Strategies">Tips & Strategies</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Subject Tag</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Biology">Biology</option>
                  <option value="General">General / All</option>
                </select>
              </div>
            </div>

            <div className="border-2 border-dashed border-white/10 hover:border-blue-500/40 rounded-2xl p-8 text-center space-y-2 cursor-pointer bg-black/20 transition-all">
              <Upload className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs font-bold text-slate-300">Click to upload or drag & drop PDF file</p>
              <p className="text-[10px] text-slate-500">Maximum file size: 25MB (PDF format recommended)</p>
            </div>

            <Button
              type="submit"
              disabled={uploading}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-emerald-600/30 text-xs flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploading ? "Publishing..." : "Publish Document to Students"}
            </Button>

          </form>
        </div>

        {/* Upload History (1 col) */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <FolderDown className="w-4 h-4 text-emerald-400" />
            Uploaded Documents
          </h3>

          <div className="space-y-3">
            {[
              { title: "GOC Formula Summary", cat: "Formula Sheets", date: "2026-01-12" },
              { title: "Ray Optics Mind Maps", cat: "Revision Notes", date: "2026-01-10" },
            ].map((doc, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] space-y-1">
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-bold rounded border border-emerald-500/30 uppercase">
                  {doc.cat}
                </span>
                <p className="font-bold text-xs text-white mt-1">{doc.title}</p>
                <p className="text-[10px] text-slate-500 text-right">{doc.date}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

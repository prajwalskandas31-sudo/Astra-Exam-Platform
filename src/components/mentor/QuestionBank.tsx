"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function QuestionBank() {
  const [questions, setQuestions] = useState<any[]>([]);

  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [qFile, setQFile] = useState<File | null>(null);
  const [aFile, setAFile] = useState<File | null>(null);
  const [setName, setSetName] = useState("");

  const fetchQuestions = () => {
    fetch("/api/questions")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setQuestions(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleJSONUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch("/api/questions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: parsed, sourceFile: file.name }),
      });
      if (res.ok) {
        alert("JSON Questions uploaded successfully!");
        fetchQuestions();
      } else {
        alert("Failed to upload JSON questions.");
      }
    } catch (err) {
      alert("Invalid JSON file.");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDualPDFSubmit = async () => {
    if (!qFile) {
      alert("Please select a Questions PDF");
      return;
    }
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", qFile);
      if (aFile) formData.append("answerFile", aFile);
      if (setName) formData.append("questionSetName", setName);

      const res = await fetch("/api/questions/upload-pdf", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Successfully parsed and uploaded ${data.count} questions from PDF!${aFile ? '\nCorrect answers mapped perfectly!' : '\n\nNOTE: No Answer Key uploaded, answers defaulted to A.'}`);
        fetchQuestions();
        setShowUploadModal(false);
        setQFile(null);
        setAFile(null);
      } else {
        const errorMsg = await res.text();
        alert(`Failed to parse PDF: ${errorMsg}`);
      }
    } catch (err) {
      alert("Error processing files.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl text-slate-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Question Bank</h2>
          <p className="text-sm text-slate-400">Manage all imported questions</p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input type="file" accept=".json" className="hidden" onChange={handleJSONUpload} disabled={uploading} />
            <Button variant="outline" type="button" disabled={uploading} className="pointer-events-none border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-white">
              <span>{uploading ? "Uploading..." : "Upload JSON"}</span>
            </Button>
          </label>
          <Button variant="outline" onClick={() => setShowUploadModal(true)} className="border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-white">Upload PDF Bundle</Button>
          <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all">+ Add Question</Button>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-[400px]">
            <h3 className="text-lg font-bold mb-4 text-white">Upload PDF Bundle</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Question Set Name (e.g. Mock Test 2026)</label>
                <input type="text" value={setName} onChange={e => setSetName(e.target.value)} className="w-full border border-slate-700 bg-slate-800/50 text-slate-200 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional identifier..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Questions PDF (Required)</label>
                <input type="file" accept=".pdf" className="w-full border border-slate-700 bg-slate-800/50 text-slate-200 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700" onChange={e => setQFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Answer Key PDF (Optional)</label>
                <input type="file" accept=".pdf" className="w-full border border-slate-700 bg-slate-800/50 text-slate-200 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-600 file:text-white hover:file:bg-slate-700" onChange={e => setAFile(e.target.files?.[0] || null)} />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowUploadModal(false)} className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white">Cancel</Button>
              <Button onClick={handleDualPDFSubmit} disabled={!qFile || uploading} className="bg-blue-600 hover:bg-blue-500 text-white">
                {uploading ? "Processing..." : "Extract Questions"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {questions.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border border-white/5 rounded-xl bg-white/[0.01]">
          No questions found. Upload a PDF or JSON to get started.
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {questions.map((q) => (
            <div key={q.id} className="p-4 border border-white/10 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <p className="font-medium text-slate-200 line-clamp-2">{q.text}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-md">{q.subject}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-700/50 text-slate-300 px-2.5 py-1 rounded-md">{q.difficulty}</span>
                {q.sourceFile && (
                  <span className="text-[10px] uppercase tracking-wider bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded-md border border-indigo-500/20 ml-auto truncate max-w-[200px]">
                    📄 {q.sourceFile}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

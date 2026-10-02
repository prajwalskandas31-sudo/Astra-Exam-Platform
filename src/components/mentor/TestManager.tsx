"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function TestManager() {
  const [tests, setTests] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("180");
  const [totalMarks, setTotalMarks] = useState("180");
  const [isPublished, setIsPublished] = useState(true);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [testType, setTestType] = useState<"PRACTICE" | "MOCK">("PRACTICE");
  const [includeTaken, setIncludeTaken] = useState(false);
  
  // Accordion State for Question Groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    try {
      const [testsRes, questionsRes] = await Promise.all([
        fetch("/api/tests"),
        fetch("/api/questions")
      ]);
      const testsData = await testsRes.json();
      const questionsData = await questionsRes.json();

      if (Array.isArray(testsData)) setTests(testsData);
      if (Array.isArray(questionsData)) setQuestions(questionsData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleQuestion = (id: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const handleCreateTest = async () => {
    if (!title || selectedQuestionIds.length === 0) {
      alert("Please enter a title and select at least one question.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          duration: parseInt(duration, 10),
          totalMarks: parseInt(totalMarks, 10),
          type: testType,
          isPublished,
          questionIds: selectedQuestionIds,
        }),
      });

      if (res.ok) {
        alert("Test created successfully!");
        setShowModal(false);
        // Reset form
        setTitle("");
        setDescription("");
        setDuration("180");
        setTotalMarks("180");
        setIsPublished(true);
        setSelectedQuestionIds([]);
        fetchData();
      } else {
        alert("Failed to create test.");
      }
    } catch (err) {
      alert("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Group questions by source file
  const filteredQuestions = includeTaken 
    ? questions 
    : questions.filter(q => (q._count?.answers || 0) === 0);

  const groupedQuestions = filteredQuestions.reduce((acc: Record<string, any[]>, q) => {
    const source = q.sourceFile || "Unknown / Manual Source";
    if (!acc[source]) acc[source] = [];
    acc[source].push(q);
    return acc;
  }, {});

  const toggleGroup = (source: string) => {
    setExpandedGroups(prev => ({ ...prev, [source]: !prev[source] }));
  };

  const handleSelectGroup = (source: string, isSelectingAll: boolean) => {
    const groupQIds = groupedQuestions[source].map((q: any) => q.id);
    if (isSelectingAll) {
      // Add all from this group that aren't already selected
      setSelectedQuestionIds(prev => Array.from(new Set([...prev, ...groupQIds])));
    } else {
      // Remove all from this group
      setSelectedQuestionIds(prev => prev.filter(id => !groupQIds.includes(id)));
    }
  };

  return (
    <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl text-slate-100 col-span-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Test Manager</h2>
          <p className="text-sm text-slate-400">Manage exams and assign grouped questions</p>
        </div>
        <Button onClick={() => { fetchData(); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all">
          + Create New Test
        </Button>
      </div>

      {tests.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border border-white/5 rounded-xl bg-white/[0.01]">
          No tests found. Create your first test to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((t) => (
            <div key={t.id} className="p-5 border border-white/10 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors relative group">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg text-slate-200 group-hover:text-white transition-colors">{t.title}</h3>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${t.isPublished ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                  {t.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 line-clamp-2">{t.description || "No description provided."}</p>
              <div className="flex gap-4 mt-4 pt-4 border-t border-white/5 text-sm text-slate-300 font-medium">
                <div className="flex items-center gap-1.5"><span className="text-slate-500">⏱</span> {t.duration} mins</div>
                <div className="flex items-center gap-1.5"><span className="text-slate-500">💯</span> {t.totalMarks} marks</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col text-slate-100">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">Create New Test</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300 ml-1">Test Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600" placeholder="e.g. PLAB 1 Mock 2026" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300 ml-1">Description</label>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600" placeholder="Optional brief details..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300 ml-1">Duration (minutes)</label>
                  <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300 ml-1">Total Marks</label>
                  <input type="number" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300 ml-1">Test Type</label>
                  <select 
                    value={testType} 
                    onChange={e => setTestType(e.target.value as "PRACTICE" | "MOCK")}
                    className="w-full bg-slate-900/50 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PRACTICE">Practice Test</option>
                    <option value="MOCK">Mock Test (Timed Window)</option>
                  </select>
                </div>
                <div className="space-y-2 col-span-full flex items-center gap-3 mt-2 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <input type="checkbox" id="published" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 bg-slate-900" />
                  <label htmlFor="published" className="text-sm font-medium text-slate-200 cursor-pointer">Publish immediately (visible to students upon creation)</label>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h4 className="font-semibold text-lg text-white">Select Questions</h4>
                    <p className="text-sm text-slate-400">{selectedQuestionIds.length} selected out of {filteredQuestions.length} available</p>
                    <div className="flex items-center gap-2 mt-2">
                      <input 
                        type="checkbox" 
                        id="includeTaken" 
                        checked={includeTaken} 
                        onChange={e => setIncludeTaken(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-blue-500 bg-slate-900"
                      />
                      <label htmlFor="includeTaken" className="text-xs text-slate-300 cursor-pointer">Include already taken/attempted questions</label>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white" onClick={() => {
                    if (selectedQuestionIds.length === filteredQuestions.length && filteredQuestions.length > 0) {
                      setSelectedQuestionIds([]);
                    } else {
                      setSelectedQuestionIds(filteredQuestions.map(q => q.id));
                    }
                  }}>
                    {selectedQuestionIds.length === filteredQuestions.length && filteredQuestions.length > 0 ? "Deselect All Everything" : "Select All Everything"}
                  </Button>
                </div>
                
                <div className="border border-slate-700/80 rounded-xl overflow-hidden bg-slate-900/50 flex flex-col min-h-[300px]">
                  {questions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 flex-1 flex items-center justify-center">No questions available. Please import them in the Question Bank first.</div>
                  ) : (
                    <div className="p-3 space-y-3">
                      {Object.entries(groupedQuestions).map(([source, groupQs]) => {
                        const isExpanded = expandedGroups[source] || false;
                        const groupQIds = groupQs.map((q: any) => q.id);
                        const allSelected = groupQIds.every(id => selectedQuestionIds.includes(id));
                        const someSelected = groupQIds.some(id => selectedQuestionIds.includes(id)) && !allSelected;

                        return (
                          <div key={source} className="border border-slate-700/60 rounded-lg overflow-hidden bg-slate-800/30">
                            <div className="p-3 bg-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-700/70 transition-colors" onClick={() => toggleGroup(source)}>
                              <div className="flex items-center gap-3">
                                <span className={`transform transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                <h5 className="font-semibold text-slate-200 flex items-center gap-2">
                                  📄 {source} 
                                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{groupQs.length}</span>
                                </h5>
                              </div>
                              <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleSelectGroup(source, !allSelected)}
                                  className={`h-7 px-3 text-xs border ${allSelected ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30' : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-600'}`}
                                >
                                  {allSelected ? "Deselect Group" : "Select Entire Group"}
                                </Button>
                              </div>
                            </div>
                            
                            {isExpanded && (
                              <div className="p-2 space-y-1 bg-slate-900/40">
                                {groupQs.map((q: any) => (
                                  <label key={q.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedQuestionIds.includes(q.id) ? 'bg-blue-900/20 border-blue-500/40' : 'bg-slate-800/20 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600'}`}>
                                    <input 
                                      type="checkbox" 
                                      className="mt-1 w-4 h-4 shrink-0 rounded border-slate-600 text-blue-500 bg-slate-900 focus:ring-blue-500" 
                                      checked={selectedQuestionIds.includes(q.id)}
                                      onChange={() => handleToggleQuestion(q.id)}
                                    />
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-slate-300 line-clamp-2">{q.text}</p>
                                      <div className="flex gap-2 mt-2">
                                        <span className="text-[10px] uppercase font-bold bg-slate-700/50 px-2 py-0.5 rounded text-slate-400">{q.subject}</span>
                                        <span className="text-[10px] uppercase font-bold bg-slate-700/50 px-2 py-0.5 rounded text-slate-400">{q.difficulty}</span>
                                      </div>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 shrink-0 bg-slate-900/80 rounded-b-2xl">
              <Button variant="outline" onClick={() => setShowModal(false)} className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white">Cancel</Button>
              <Button onClick={handleCreateTest} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                {loading ? "Creating Test..." : "Confirm & Create Test"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

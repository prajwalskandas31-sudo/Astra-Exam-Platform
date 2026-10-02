"use client";

import { useEffect, useState } from "react";
import { Send, ShoppingBag, CheckCircle2, Clock, Sparkles, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ParentRequestsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Custom Request Form state
  const [examCategory, setExamCategory] = useState("JEE");
  const [testCount, setTestCount] = useState(5);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/parent/request-mocks");
      if (res.ok) {
        const resData = await res.json();
        setData(resData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/parent/request-mocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examCategory, testCount, notes })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success(resData.message);
        setNotes("");
        fetchRequests();
      } else {
        toast.error("Failed to submit request");
      }
    } catch (err) {
      toast.error("Error submitting mock test request");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePurchasePackage = async (pkg: any) => {
    toast.loading(`Processing mock test package allocation for ${pkg.title}...`);
    try {
      const res = await fetch("/api/parent/request-mocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examCategory: pkg.examCategory,
          testCount: pkg.testCount,
          packageId: pkg.id,
          notes: `Purchased package ${pkg.title}`
        })
      });

      const resData = await res.json();
      if (res.ok) {
        toast.dismiss();
        toast.success(`🎉 ${pkg.title} successfully allocated to your child's portal!`);
        fetchRequests();
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Error completing package allocation");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 font-medium text-xs">Loading mock test catalog...</p>
        </div>
      </div>
    );
  }

  const mockPackages = data?.mockPackages || [];
  const previousRequests = data?.previousRequests || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Request & Purchase Mock Test Series</h1>
          <p className="text-sm text-slate-400 mt-1">
            Request additional proctored CBT mocks from faculty or unlock premium exam booster packages.
          </p>
        </div>
      </div>

      {/* Grid: Custom Request Form + Previous Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 1 col: Request Form */}
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Send className="w-4 h-4 text-emerald-400" />
            Submit Custom Test Request
          </h2>

          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase block mb-1">Exam Target Category</label>
              <select
                value={examCategory}
                onChange={(e) => setExamCategory(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500"
              >
                {["JEE", "NEET", "GATE", "AFCAT", "PLAB", "COMEDK", "SSC CGL"].map(c => (
                  <option key={c} value={c}>{c} Exam Series</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase block mb-1">Number of Test Sets Requested</label>
              <input
                type="number"
                min={1}
                max={20}
                value={testCount}
                onChange={(e) => setTestCount(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase block mb-1">Custom Notes / Topic Weakness Focus</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Request focus on specific weak chapters like Chemistry Kinetics or Physics Electromagnetism..."
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-blue-500 min-h-[100px]"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 text-xs rounded-xl shadow-lg shadow-emerald-600/30"
            >
              {submitting ? "Submitting Request..." : "🚀 Send Request to Faculty"}
            </Button>
          </form>
        </div>

        {/* Right 2 cols: Premium Test Packages Catalog */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <ShoppingBag className="w-5 h-5 text-blue-400" />
              Available Premium Test Booster Packages
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockPackages.map((pkg: any) => (
                <div
                  key={pkg.id}
                  className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold rounded uppercase">
                        {pkg.examCategory} PACK
                      </span>
                      <span className="px-2.5 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 text-[9px] font-black rounded uppercase">
                        {pkg.badge}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-base leading-tight">{pkg.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{pkg.description}</p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block">{pkg.testCount} Full Mocks</span>
                      <span className="text-xl font-black text-emerald-400">₹{pkg.price.toLocaleString()}</span>
                    </div>

                    <Button
                      onClick={() => handlePurchasePackage(pkg)}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 text-xs px-4 rounded-xl shadow-md"
                    >
                      Unlock Package
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Previous Request History */}
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Recent Request History ({previousRequests.length})
            </h3>

            <div className="space-y-3">
              {previousRequests.map((req: any) => (
                <div key={req.id} className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-slate-400">{req.id}</span>
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[9px] font-bold rounded uppercase">
                        {req.examCategory} ({req.testCount} Tests)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{req.notes}</p>
                  </div>

                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase border shrink-0 ${
                    req.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                    'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

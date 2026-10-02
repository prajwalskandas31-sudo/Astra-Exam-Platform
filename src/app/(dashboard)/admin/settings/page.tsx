"use client";

import { useState } from "react";
import { Settings, ShieldCheck, Lock, Bell, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [tabSwitchLimit, setTabSwitchLimit] = useState("3");
  const [enableWebcamProctoring, setEnableWebcamProctoring] = useState(true);
  const [enableScientificCalc, setEnableScientificCalc] = useState(true);

  const handleSaveSettings = () => {
    toast.success("Admin system settings updated!");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Admin System Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure proctoring security levels, tab switch threshold, calculator policies & tenant defaults</p>
      </div>

      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-6">
        <div className="border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            Proctoring & Anti-Cheating Controls
          </h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Max Tab Switch Violations before Auto-Submit</label>
            <input 
              type="number"
              value={tabSwitchLimit}
              onChange={(e) => setTabSwitchLimit(e.target.value)}
              className="w-full max-w-xs p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-xs font-bold text-slate-200">Webcam Proctoring Checks</p>
              <p className="text-[11px] text-slate-400">Random snapshot verification during live mock exams</p>
            </div>
            <input 
              type="checkbox"
              checked={enableWebcamProctoring}
              onChange={(e) => setEnableWebcamProctoring(e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-xs font-bold text-slate-200">GATE Scientific Calculator Access</p>
              <p className="text-[11px] text-slate-400">Allow VirtualCalculator component for engineering exam templates</p>
            </div>
            <input 
              type="checkbox"
              checked={enableScientificCalc}
              onChange={(e) => setEnableScientificCalc(e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </div>
        </div>

        <Button 
          onClick={handleSaveSettings}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-6 rounded-xl text-xs flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Security Settings
        </Button>
      </div>

    </div>
  );
}

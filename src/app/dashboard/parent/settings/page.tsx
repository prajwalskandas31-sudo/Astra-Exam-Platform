"use client";

import { useState } from "react";
import { User, Send, Save, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ParentSettingsPage() {
  const [parentName, setParentName] = useState("Srinivasa S");
  const [whatsappPhone, setWhatsappPhone] = useState("+91 98765 43210");
  const [email] = useState("parent@astra.com");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Parent settings and WhatsApp dispatch phone updated!");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Parent Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure profile details & WhatsApp phone number for automated result dispatches</p>
      </div>

      <form onSubmit={handleSave} className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4 max-w-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
          <User className="w-4 h-4 text-blue-400" />
          Parent Account Profile
        </h2>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Parent Full Name</label>
          <input 
            type="text"
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            required
            className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">WhatsApp Phone (For Dispatches)</label>
          <input 
            type="text"
            value={whatsappPhone}
            onChange={(e) => setWhatsappPhone(e.target.value)}
            required
            className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Account Email</label>
          <input 
            type="email"
            value={email}
            disabled
            className="w-full p-3 bg-slate-950/50 border border-white/5 rounded-xl text-xs text-slate-400 cursor-not-allowed"
          />
        </div>

        <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-6 rounded-xl text-xs">
          Save Settings
        </Button>
      </form>

    </div>
  );
}

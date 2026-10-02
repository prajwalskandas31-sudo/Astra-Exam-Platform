"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Bell, Shield, Building2, Save } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function MentorSettingsPage() {
  const { data: session } = useSession();

  const [fullName, setFullName] = useState(session?.user?.name || "Dr. Rajesh Sharma");
  const [email] = useState(session?.user?.email || "mentor@astra.com");
  const [specialization, setSpecialization] = useState("Physics & Mechanics");

  const handleSave = () => {
    toast.success("Mentor settings saved successfully!");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Mentor Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your faculty profile, subject specializations & notification preferences</p>
      </div>

      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-6">
        <div className="border-b border-white/10 pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            Faculty Profile
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Full Name</label>
            <input 
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Email</label>
            <input 
              type="email"
              value={email}
              disabled
              className="w-full p-3 bg-slate-950/50 border border-white/5 rounded-xl text-xs text-slate-400 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Subject Specialization</label>
            <input 
              type="text"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <Button 
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-6 rounded-xl text-xs"
        >
          Save Changes
        </Button>
      </div>

    </div>
  );
}

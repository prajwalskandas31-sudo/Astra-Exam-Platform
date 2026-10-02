"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Shield, GraduationCap, Users, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface ProfileSwitcherProps {
  currentRole: string;
}

export function ProfileSwitcher({ currentRole }: ProfileSwitcherProps) {
  const [switching, setSwitching] = useState(false);
  const router = useRouter();

  const handleRoleSwitch = async (targetRole: string, destination: string) => {
    if (targetRole === currentRole) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole })
      });

      if (res.ok) {
        toast.success(`Switched active profile to ${targetRole}!`);
        // Refresh router & navigate to target portal destination
        router.push(destination);
        router.refresh();
      } else {
        toast.error("Failed to switch profile role");
      }
    } catch (err) {
      toast.error("Error switching profile");
    } finally {
      setSwitching(false);
    }
  };

  const roles = [
    { label: "Student", role: "STUDENT", dest: "/student", icon: GraduationCap, color: "text-blue-400" },
    { label: "Teacher / Mentor", role: "MENTOR", dest: "/mentor/students", icon: UserCheck, color: "text-emerald-400" },
    { label: "Parent Oversight", role: "PARENT", dest: "/dashboard/parent", icon: Users, color: "text-purple-400" },
    { label: "Admin Portal", role: "ADMIN", dest: "/admin", icon: Shield, color: "text-amber-400" }
  ];

  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-2 space-y-1.5 mb-3">
      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider px-1">
        Switch Profile Portal:
      </p>
      <div className="grid grid-cols-2 gap-1">
        {roles.map((r) => {
          const Icon = r.icon;
          const isActive = currentRole === r.role || (currentRole === "FACULTY" && r.role === "MENTOR");
          return (
            <button
              key={r.role}
              disabled={switching}
              onClick={() => handleRoleSwitch(r.role, r.dest)}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all border ${
                isActive
                  ? 'bg-blue-600/30 border-blue-500/50 text-white shadow-sm'
                  : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-3 h-3 ${r.color}`} />
              <span className="truncate">{r.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

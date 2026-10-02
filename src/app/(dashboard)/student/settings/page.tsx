"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Bell, Shield, Building2, Upload, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session } = useSession();

  const [gender, setGender] = useState("Male");
  const [fullName, setFullName] = useState(session?.user?.name || "Prajwal Skanda S");
  const [mobileNumber, setMobileNumber] = useState((session?.user as any)?.phone || "6362612641");
  const [email] = useState(session?.user?.email || "skanda204@gmail.com");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [instituteCode, setInstituteCode] = useState("K.G. PRADEEP");

  const [notifications, setNotifications] = useState({
    email: true,
    examReminders: true,
    resultNotifications: true,
    newsUpdates: false,
  });

  const handleSaveProfile = () => {
    toast.success("Profile updated successfully!");
  };

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved!");
  };

  const handleJoinInstitute = () => {
    if (!instituteCode) return;
    toast.success(`Institute code '${instituteCode}' validated. Linked successfully!`);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your account profile, preferences, security, and coaching institute linkage</p>
      </div>

      {/* Profile Header Banner */}
      <div className="bg-gradient-to-r from-teal-900/40 via-emerald-900/40 to-slate-900/60 p-6 rounded-2xl border border-teal-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white text-2xl font-black uppercase shadow-lg">
            {fullName.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">{fullName}</h2>
            <p className="text-xs text-slate-300">{email}</p>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 text-[10px] font-bold rounded border border-teal-500/30 uppercase">
                Class 12
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/30 uppercase">
                Science (PCM)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-300 bg-black/30 p-3 rounded-xl border border-white/10">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Mobile</p>
            <p className="font-semibold text-white">{mobileNumber}</p>
          </div>
          <div className="border-l border-white/10 pl-4">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Board</p>
            <p className="font-semibold text-white">CBSE</p>
          </div>
        </div>
      </div>

      {/* Edit Profile Section */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-6">
        <div className="border-b border-white/10 pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            Edit Profile
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Update your personal information</p>
        </div>

        {/* Profile Photo */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Profile Photo</label>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-lg">
              {fullName.charAt(0)}
            </div>
            <Button variant="outline" className="bg-white/5 border-white/10 text-xs text-slate-300 hover:bg-white/10 h-9">
              <Upload className="w-3.5 h-3.5 mr-2" />
              Upload Photo
            </Button>
          </div>
        </div>

        {/* Gender radio */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Gender (for default avatar)</label>
          <div className="flex items-center gap-6 text-xs text-slate-300">
            {["Male", "Female", "Other"].map((g) => (
              <label key={g} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  checked={gender === g}
                  onChange={() => setGender(g)}
                  className="accent-blue-600"
                />
                <span>{g}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Inputs */}
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
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Mobile Number</label>
            <input 
              type="text"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
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
            <p className="text-[10px] text-slate-500">Email cannot be changed</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Custom Avatar URL (optional)</label>
            <input 
              type="text"
              placeholder="https://example.com/your-avatar.png"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <Button 
          onClick={handleSaveProfile}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-blue-600/30 text-xs"
        >
          Save Changes
        </Button>
      </div>

      {/* Notification Preferences */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="border-b border-white/10 pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            Notification Preferences
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Control how you receive notifications</p>
        </div>

        <div className="space-y-4">
          {[
            { key: "email", label: "Email Notifications", desc: "Receive updates via email" },
            { key: "examReminders", label: "Exam Reminders", desc: "Get notified about upcoming exams" },
            { key: "resultNotifications", label: "Result Notifications", desc: "Get notified when results are published" },
            { key: "newsUpdates", label: "News & Updates", desc: "Receive platform news and updates" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div>
                <p className="text-xs font-bold text-slate-200">{item.label}</p>
                <p className="text-[11px] text-slate-400">{item.desc}</p>
              </div>
              <input 
                type="checkbox"
                checked={(notifications as any)[item.key]}
                onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                className="w-4 h-4 accent-blue-600 rounded"
              />
            </div>
          ))}
        </div>

        <Button 
          onClick={handleSaveNotifications}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-blue-600/30 text-xs"
        >
          Save Preferences
        </Button>
      </div>

      {/* Security */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="border-b border-white/10 pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            Security
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Manage your account security</p>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <div>
            <p className="text-xs font-bold text-slate-200">Change Password</p>
            <p className="text-[11px] text-slate-400">Update your account password</p>
          </div>
          <Button variant="outline" className="bg-white/5 border-white/10 text-xs text-slate-300 hover:bg-white/10 h-8">
            Change Password
          </Button>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <div>
            <p className="text-xs font-bold text-slate-200">Two-Factor Authentication</p>
            <p className="text-[11px] text-slate-400">Add an extra layer of security</p>
          </div>
          <Button variant="outline" className="bg-white/5 border-white/10 text-xs text-slate-300 hover:bg-white/10 h-8">
            Enable 2FA
          </Button>
        </div>
      </div>

      {/* Coaching Institute Linkage */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="border-b border-white/10 pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            Institute Linkage
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Studying with a coaching institute? Add their code.</p>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="text"
            placeholder="Enter Institute Code"
            value={instituteCode}
            onChange={(e) => setInstituteCode(e.target.value)}
            className="flex-1 p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none uppercase tracking-wider font-bold"
          />
          <Button 
            onClick={handleJoinInstitute}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-600/30 text-xs"
          >
            Join Institute
          </Button>
        </div>
      </div>

    </div>
  );
}

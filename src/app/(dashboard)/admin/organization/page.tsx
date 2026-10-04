"use client";

import { useState } from "react";
import { Building2, Save, Globe, Phone, Mail, Image as ImageIcon, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function OrganizationBrandingPage() {
  const [name, setName] = useState("Apex Academy");
  const [slug, setSlug] = useState("apex-academy");
  const [logoUrl, setLogoUrl] = useState("https://apexacademy.in/logo.png");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#1e40af");
  const [contactEmail, setContactEmail] = useState("admin@apexacademy.in");
  const [contactPhone, setContactPhone] = useState("+91 98765 43210");
  const [customDomain, setCustomDomain] = useState("tests.apexacademy.in");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [offeredCategories, setOfferedCategories] = useState<string[]>(["JEE", "NEET"]);
  const [saving, setSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      toast.success("Organization white-label settings updated!");
      setSaving(false);
    }, 800);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Organization & White-Label Branding</h1>
        <p className="text-sm text-slate-400 mt-1">Configure institute tenant branding, logo, primary colors, custom domain & WhatsApp settings</p>
      </div>

      <form onSubmit={handleSave} className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
        
        <div className="border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            Institute Branding Configuration
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Institute Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Tenant Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Contact Phone</label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Primary Brand Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-xl bg-slate-950 border border-white/10 cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white uppercase font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Secondary Brand Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-10 h-10 rounded-xl bg-slate-950 border border-white/10 cursor-pointer"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="flex-1 p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white uppercase font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Custom Domain (CNAME)</label>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="e.g. tests.coaching.com"
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Academic Year</label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2 mt-4">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">Offered Exam Categories</label>
            <p className="text-xs text-slate-400 mb-3">Select the specific examinations offered to your students. This controls what they see on their dashboard.</p>
            <div className="flex flex-wrap gap-3">
              {["JEE", "NEET", "GATE", "AFCAT", "SSC", "CUSTOM"].map(cat => (
                <label key={cat} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-all ${
                  offeredCategories.includes(cat) 
                    ? "bg-blue-600/20 border-blue-500 text-blue-300" 
                    : "bg-slate-900/50 border-white/10 text-slate-400 hover:bg-slate-800"
                }`}>
                  <input 
                    type="checkbox"
                    className="hidden"
                    checked={offeredCategories.includes(cat)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setOfferedCategories([...offeredCategories, cat]);
                      } else {
                        setOfferedCategories(offeredCategories.filter(c => c !== cat));
                      }
                    }}
                  />
                  <CheckCircle2 className={`w-4 h-4 ${offeredCategories.includes(cat) ? "opacity-100" : "opacity-0 hidden"}`} />
                  <span className="text-sm font-semibold">{cat}</span>
                </label>
              ))}
            </div>
          </div>

        </div>

        <Button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-blue-600/30 text-xs flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving Changes..." : "Save White-Label Configuration"}
        </Button>

      </form>

    </div>
  );
}

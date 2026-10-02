"use client";

import { useState } from "react";
import { ShoppingBag, Plus, Tag, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminPackagesPage() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("4500");
  const [tag, setTag] = useState("JEE Mains");
  const [validityDays, setValidityDays] = useState("720");

  const packages = [
    { title: "JEE VIJETA Test Series [2026]", tag: "JEE Mains", price: "₹4,500", validity: "720 days", count: 187 },
    { title: "JEE Main Vijeta Test Series [2027]", tag: "JEE Mains", price: "₹6,500", validity: "720 days", count: 50 },
    { title: "BITSAT Assertion & Reason Chapterwise", tag: "BITSAT", price: "₹999", validity: "720 days", count: 77 },
  ];

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    toast.success(`Test package '${title}' created & listed in student marketplace!`);
    setTitle("");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Test Package Marketplace Catalog</h1>
        <p className="text-sm text-slate-400 mt-1">Configure test series packages, pricing, validity duration & student store listings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Package Form (1 col) */}
        <form onSubmit={handleCreatePackage} className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4 h-fit">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Plus className="w-4 h-4 text-blue-400" />
            Create New Package
          </h2>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Package Title</label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. JEE Main Vijeta 2026"
              required
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Price (₹)</label>
              <input 
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Validity (Days)</label>
              <input 
                type="text"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                required
                className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Category Tag</label>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
            >
              <option value="JEE Mains">JEE Mains</option>
              <option value="JEE Advanced">JEE Advanced</option>
              <option value="NEET (UG)">NEET (UG)</option>
              <option value="BITSAT">BITSAT</option>
              <option value="COMEDK">COMEDK</option>
            </select>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 text-xs rounded-xl shadow-lg shadow-blue-600/30">
            Publish Package
          </Button>
        </form>

        {/* Existing Packages (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            Marketplace Test Series Packages ({packages.length})
          </h2>

          <div className="space-y-3">
            {packages.map((pkg, i) => (
              <div key={i} className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between">
                <div>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded uppercase">
                    {pkg.tag}
                  </span>
                  <h3 className="font-bold text-white text-sm mt-1">{pkg.title}</h3>
                  <p className="text-xs text-slate-400">Validity: {pkg.validity} • {pkg.count} Tests Included</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-emerald-400">{pkg.price}</p>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-bold rounded">LISTED</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

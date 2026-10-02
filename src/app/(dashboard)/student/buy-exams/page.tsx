"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Search, CheckCircle2, Star, ShieldCheck, Sparkles, Filter } from "lucide-react";
import { toast } from "sonner";

export default function BuyExamsPage() {
  const [viewMode, setViewMode] = useState<"exam" | "topic" | "class">("exam");
  const [selectedTag, setSelectedTag] = useState<string>("All");

  const tags = [
    "All", "JEE Mains", "JEE Advanced", "NEET (UG)", "BITSAT", "Olympiad", "MHT CET", "WBJEE", "COMEDK", "GUJCET"
  ];

  const packages = [
    {
      id: "pkg-1",
      title: "JEE VIJETA Test Series [2026]",
      tag: "JEE Mains",
      price: "₹4,500",
      validity: "720 days",
      testsCount: 187,
      gradient: "from-blue-600/20 to-indigo-600/20 border-blue-500/30",
    },
    {
      id: "pkg-2",
      title: "JEE Main Vijeta Test Series [2027]",
      tag: "JEE Mains",
      price: "₹6,500",
      validity: "720 days",
      testsCount: 50,
      gradient: "from-purple-600/20 to-pink-600/20 border-purple-500/30",
    },
    {
      id: "pkg-3",
      title: "BITSAT Assertion & Reason Chapterwise",
      tag: "BITSAT",
      price: "₹999",
      validity: "720 days",
      testsCount: 77,
      gradient: "from-amber-600/20 to-orange-600/20 border-amber-500/30",
    },
    {
      id: "pkg-4",
      title: "JEE Adv. Warrior Test Series [2026]",
      tag: "JEE Advanced",
      price: "₹5,000",
      validity: "720 days",
      testsCount: 56,
      gradient: "from-red-600/20 to-rose-600/20 border-red-500/30",
    },
    {
      id: "pkg-5",
      title: "Olympiad Master Test Series [2026]",
      tag: "Olympiad",
      price: "₹2,500",
      validity: "720 days",
      testsCount: 0,
      gradient: "from-emerald-600/20 to-teal-600/20 border-emerald-500/30",
    },
    {
      id: "pkg-6",
      title: "BITSAT Champion Test Series [2026]",
      tag: "BITSAT",
      price: "₹4,500",
      validity: "720 days",
      testsCount: 0,
      gradient: "from-cyan-600/20 to-blue-600/20 border-cyan-500/30",
    },
    {
      id: "pkg-7",
      title: "MHT CET Conqueror Test Series [2026]",
      tag: "MHT CET",
      price: "₹1,200",
      validity: "720 days",
      testsCount: 0,
      gradient: "from-indigo-600/20 to-purple-600/20 border-indigo-500/30",
    },
    {
      id: "pkg-8",
      title: "WBJEE Elite Test Series [2026]",
      tag: "WBJEE",
      price: "₹1,200",
      validity: "720 days",
      testsCount: 0,
      gradient: "from-violet-600/20 to-fuchsia-600/20 border-violet-500/30",
    },
  ];

  const filteredPackages = selectedTag === "All" 
    ? packages 
    : packages.filter(p => p.tag.toLowerCase() === selectedTag.toLowerCase());

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900/60 p-8 rounded-3xl border border-white/10 shadow-2xl text-center space-y-4 relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold rounded-full">
          <Sparkles className="w-3.5 h-3.5" />
          Premium Test Series
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
          Thoughtfully Designed Tests To Boost <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">Your Concepts, Speed & Accuracy</span>
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          Practice with exam-level questions crafted by top educators & subject matter experts. Instant activation after enrollment.
        </p>

        {/* View Mode Switcher */}
        <div className="inline-flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/10 mt-4">
          {[
            { id: "exam", label: "Exam Wise" },
            { id: "topic", label: "Topic Wise" },
            { id: "class", label: "Class Wise" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === mode.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter Tags */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedTag === tag
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20'
                : 'bg-slate-900/60 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredPackages.map((pkg) => (
          <div 
            key={pkg.id} 
            className={`rounded-2xl border bg-gradient-to-br ${pkg.gradient} backdrop-blur-md p-6 flex flex-col justify-between shadow-xl hover:scale-[1.02] transition-all relative overflow-hidden group`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-white/10 border border-white/20 text-white text-[10px] font-bold rounded-md uppercase tracking-wider">
                  {pkg.tag}
                </span>
                <span className="text-xl font-black text-white">{pkg.price}</span>
              </div>
              <h3 className="font-bold text-slate-100 text-base group-hover:text-white transition-colors leading-snug">
                {pkg.title}
              </h3>
              <div className="space-y-1 text-xs text-slate-400 pt-2 border-t border-white/10">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  Valid for: <strong>{pkg.validity}</strong>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  No. of Tests: <strong>{pkg.testsCount}</strong>
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-6">
              <Button 
                onClick={() => toast.success(`Enrolled in ${pkg.title}`)}
                className="w-1/2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold h-10 rounded-xl shadow-lg shadow-blue-600/30"
              >
                Buy Now
              </Button>
              <Button 
                variant="outline"
                className="w-1/2 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 text-xs font-bold h-10 rounded-xl"
              >
                View Details
              </Button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

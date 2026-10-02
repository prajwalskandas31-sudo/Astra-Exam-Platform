"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"cbt" | "omr" | "analytics" | "whatsapp">("cbt");
  const [activeCategory, setActiveCategory] = useState<"all" | "plab" | "neet" | "jee" | "gate">("all");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAiAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setAiAnswer(`Based on recent exam patterns, "${aiQuestion}" is a high-yield concept! We recommend practicing 15 targeted MCQs from our PLAB 1 & NEET UG question bank.`);
  };

  const testSeries = [
    {
      id: "plab1-ultimate",
      category: "plab",
      title: "PLAB 1 / UK MLA Ultimate Master Series 2026",
      subtitle: "GMC UK Pattern • High Yield Clinical Scenarios",
      testsCount: "180+ Mock Tests",
      validity: "720 Days",
      enrolled: "6,420 Aspirants",
      badge: "🔥 HOT",
      badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      gradient: "from-blue-600 via-indigo-600 to-purple-600",
      originalPrice: "₹8,999",
      price: "₹4,499",
      discount: "50% OFF",
      features: [
        "180 Scenarios matching actual GMC UK exam screen",
        "NICE Guidelines 2025/2026 updated explanations",
        "Instant score report with domain-wise percentile",
        "AES-256 encrypted WhatsApp report for guardians"
      ]
    },
    {
      id: "neet-ug-pro",
      category: "neet",
      title: "NEET UG All-India Rank Booster Pack",
      subtitle: "Pen & Paper OMR + CBT Dual Mode",
      testsCount: "197 Mock Tests",
      validity: "365 Days",
      enrolled: "8,950 Students",
      badge: "⭐ TOP RATED",
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      gradient: "from-emerald-600 via-teal-600 to-cyan-600",
      originalPrice: "₹6,499",
      price: "₹3,249",
      discount: "50% OFF",
      features: [
        "200-Question NTA NEET pattern with section choices",
        "Interactive printable bubble OMR sheet simulator",
        "NCERT line-by-line explanation & page references",
        "AI Weakness detector with instant retest generator"
      ]
    },
    {
      id: "jee-main-adv",
      category: "jee",
      title: "JEE Main & Advanced 99%ile Challenger Series",
      subtitle: "NTA CBT Software Replica • Integer & Numerical Qs",
      testsCount: "165 Mock Tests",
      validity: "365 Days",
      enrolled: "5,310 Aspirants",
      badge: "🚀 POPULAR",
      badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      gradient: "from-purple-600 via-pink-600 to-rose-600",
      originalPrice: "₹7,499",
      price: "₹3,999",
      discount: "46% OFF",
      features: [
        "Authentic NTA JEE CBT interface with virtual calculator",
        "Integer & decimal numerical response validation",
        "Step-by-step video & TeX math solutions",
        "National rank predictor & speed vs accuracy matrix"
      ]
    },
    {
      id: "gate-comedk-super",
      category: "gate",
      title: "GATE & COMEDK Engineering Super Series",
      subtitle: "Scientific Calculator Integrated • Branch-wise Tests",
      testsCount: "140 Mock Tests",
      validity: "540 Days",
      enrolled: "3,120 Aspirants",
      badge: "NEW",
      badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      gradient: "from-amber-500 via-orange-600 to-red-600",
      originalPrice: "₹5,999",
      price: "₹2,999",
      discount: "50% OFF",
      features: [
        "Built-in onscreen Virtual Scientific Calculator",
        "MSQ (Multiple Select Questions) partial marking preview",
        "Topic-wise chapter drills for Mechanical, CS, ECE & EE",
        "Proctored exam simulator with tab-switch logging"
      ]
    }
  ];

  const filteredTestSeries = activeCategory === "all"
    ? testSeries
    : testSeries.filter(t => t.category === activeCategory);

  const faqs = [
    {
      q: "Which competitive exams are supported on the Astra Exam Platform?",
      a: "Our platform provides 100% authentic CBT (Computer-Based Test) & Pen-Paper OMR Sheet environments for PLAB 1 / UK MLA, NEET UG, JEE Main & Advanced, GATE (with integrated Virtual Scientific Calculator), COMEDK, AFCAT, and custom coaching institute exams."
    },
    {
      q: "How does the Anti-Cheat & Live Proctoring system work?",
      a: "Our CBT exam interface enforces mandatory full-screen lockdown, logs tab switches or window blur events in real-time, disables copy-paste keyboard shortcuts, and automatically submits the attempt if anti-cheat violation thresholds are exceeded."
    },
    {
      q: "How are parent WhatsApp report cards generated and delivered?",
      a: "Upon test submission, our Notification Engine encrypts test metrics using AES-256 and dispatches a secure link to linked parent/student WhatsApp numbers. Guardians can review overall score, percentile, subject breakdown, and time spent per question without downloading any app."
    },
    {
      q: "Can coaching institutes customize white-label branding?",
      a: "Yes! Multi-tenancy is natively built into Astra Exam Platform. Institutes get a dedicated custom subdomain, logo watermark, custom brand color theme, batch-wise test scheduler, and isolated question bank privacy."
    },
    {
      q: "Can I practice on mobile phones and tablets?",
      a: "Absolutely! The entire platform is built with high-performance responsive web design. You can attempt CBT mocks or fill pen-paper OMR bubble sheets on desktop laptops, tablets, or smartphones seamlessly."
    }
  ];

  const testimonials = [
    {
      name: "Dr. Ananya Roy",
      exam: "PLAB 1 Passed (168 / 180)",
      date: "Nov 2025 Exam",
      avatar: "👩‍⚕️",
      text: "The Astra Exam Platform CBT software replica is identical to the actual exam screen in London! The timer layout and single-click question navigation gave me total confidence on exam day.",
      rankBadge: "PLAB 1 QUALIFIED"
    },
    {
      name: "Rohan Varma",
      exam: "NEET UG • AIR 241",
      date: "May 2025 Attempt",
      avatar: "👨‍🎓",
      text: "The interactive Pen-Paper OMR sheet simulator helped me eliminate silly bubbling mistakes. The automated WhatsApp reports kept my parents updated after every Sunday mock test!",
      rankBadge: "AIR 241"
    },
    {
      name: "Siddharth Mehta",
      exam: "JEE Main • 99.92 %ile",
      date: "Jan 2026 Session",
      avatar: "🧑‍💻",
      text: "The instant weakness detector flagged my weak topics in Electrodynamics. Taking the 1-click adaptive retests boosted my physics score from 62 to 96 marks in just 3 weeks.",
      rankBadge: "99.92 %ile"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 overflow-x-hidden relative selection:bg-blue-600 selection:text-white bg-grid-pattern">
      {/* Background Radial Ambient Lights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-tr from-blue-600/25 via-indigo-600/20 to-purple-600/15 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute top-[35%] right-0 w-[700px] h-[500px] bg-purple-600/15 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-0 w-[800px] h-[500px] bg-emerald-600/15 blur-[160px] rounded-full pointer-events-none" />

      {/* Top Banner Announcement Ticker */}
      <div className="bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-purple-900/90 border-b border-blue-500/20 text-xs py-2 px-4 text-center backdrop-blur-md relative z-50 flex items-center justify-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 font-bold uppercase tracking-wider text-[10px]">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          2026 SEASON LIVE
        </span>
        <span className="text-slate-200 font-medium hidden sm:inline">
          ⚡ Practice PLAB 1, NEET UG & JEE CBT Mock Tests with Real Exam Software Replica
        </span>
        <Link href="/login" className="font-bold text-blue-400 hover:text-white underline transition-colors">
          Claim 6 Free Mock Tests →
        </Link>
      </div>

      {/* Sticky Glassmorphic Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/85 border-b border-white/10 shadow-2xl transition-all">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-400 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-[0_0_20px_rgba(37,99,235,0.45)] group-hover:scale-105 transition-transform">
              A
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
                  Astra Exam Platform
                </span>
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-bold tracking-wide">
                  PRO
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400">
                AI CBT & OMR Assessment Platform
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <a href="#test-series" className="hover:text-blue-400 transition-colors">Test Series</a>
            <a href="#simulator" className="hover:text-blue-400 transition-colors">Live CBT Simulator</a>
            <a href="#features" className="hover:text-blue-400 transition-colors">Features</a>
            <a href="#why-us" className="hover:text-blue-400 transition-colors">Why Choose Us</a>
            <a href="#reviews" className="hover:text-blue-400 transition-colors">Testimonials</a>
            <a href="#faq" className="hover:text-blue-400 transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 transition-all font-bold text-sm px-4">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_25px_rgba(37,99,235,0.4)] hover:shadow-[0_0_35px_rgba(37,99,235,0.6)] transition-all font-bold rounded-xl px-5 h-10 text-sm">
                Register Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        {/* Pulsing Highlight Badge */}
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold tracking-wide uppercase mb-8 backdrop-blur-md shadow-inner animate-fade-in-up">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
          </span>
          <span>⚡ #1 AI-Powered Test Engine for Astra Exam Platform & Competitive Mocks</span>
        </div>

        {/* Display Typography */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.08] max-w-5xl mx-auto text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300">
          Master Your Mocks With <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
            Real CBT Software Precision
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed font-normal">
          Experience authentic CBT test screens, pen-paper NEET OMR bubble sheet simulation, live proctoring anti-cheat, instant weakness diagnostics, and encrypted parent WhatsApp performance dispatch.
        </p>

        {/* Hero Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto px-8 h-14 text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.45)] hover:shadow-[0_0_45px_rgba(37,99,235,0.65)] transition-all rounded-xl border-t border-blue-400">
              🚀 Start Free Practice Test
            </Button>
          </Link>
          <a href="#simulator" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 h-14 text-base font-bold border-white/15 bg-slate-900/80 hover:bg-slate-800 text-slate-200 backdrop-blur-md rounded-xl transition-all">
              ▶ Launch Live CBT Demo
            </Button>
          </a>
        </div>

        {/* Metrics Matrix Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-2xl mb-24">
          <div className="p-4 text-center">
            <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">15,000+</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1.5">Active Aspirants</p>
          </div>
          <div className="p-4 text-center border-l border-white/10">
            <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">500,000+</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1.5">Curated Q-Bank</p>
          </div>
          <div className="p-4 text-center border-l border-white/10">
            <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">99.8%</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1.5">Screen Accuracy</p>
          </div>
          <div className="p-4 text-center border-l border-white/10">
            <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">0 ms</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1.5">Autosave Latency</p>
          </div>
        </div>

        {/* Premium Test Series Catalog Showcase (Core mocktest.club feature) */}
        <section id="test-series" className="my-20 text-left">
          <div className="text-center mb-12">
            <span className="px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">
              Explore Assessment Packages
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-3">
              Premium Mock Test Series
            </h2>
            <p className="text-slate-400 mt-2 text-base max-w-2xl mx-auto">
              Curated exam bundles with full length tests, topic drills, authentic timer palettes, and detailed solution keys.
            </p>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
              {[
                { id: "all", label: "All Test Series" },
                { id: "plab", label: "PLAB 1 / UK MLA" },
                { id: "neet", label: "NEET UG Medical" },
                { id: "jee", label: "JEE Main & Advanced" },
                { id: "gate", label: "GATE & COMEDK" }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                    activeCategory === cat.id
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400"
                      : "bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredTestSeries.map(test => (
              <div
                key={test.id}
                className="rounded-3xl bg-slate-900/60 border border-white/10 hover:border-blue-500/50 backdrop-blur-2xl transition-all duration-300 group hover:-translate-y-1 shadow-2xl flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Banner Ribbon Header */}
                  <div className={`p-6 bg-gradient-to-r ${test.gradient} relative overflow-hidden`}>
                    <div className="flex justify-between items-start relative z-10">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${test.badgeBg}`}>
                        {test.badge}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-black/40 text-white text-[11px] font-bold border border-white/20">
                        {test.validity} Validity
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-white mt-4 relative z-10 leading-tight">
                      {test.title}
                    </h3>
                    <p className="text-xs font-medium text-white/80 mt-1 relative z-10">
                      {test.subtitle}
                    </p>
                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-300">
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                        <span>📝</span> {test.testsCount}
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                        <span>👥</span> {test.enrolled}
                      </div>
                    </div>

                    <ul className="space-y-2.5 text-xs text-slate-300">
                      {test.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Pricing & CTA */}
                <div className="p-6 border-t border-white/10 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-white">{test.price}</span>
                      <span className="text-sm line-through text-slate-500">{test.originalPrice}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        {test.discount}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">All-Inclusive Access • Instant Activation</p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link href="/login" className="flex-1 sm:flex-none">
                      <Button variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold rounded-xl h-11">
                        Free Demo
                      </Button>
                    </Link>
                    <Link href="/login" className="flex-1 sm:flex-none">
                      <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl h-11 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                        Enroll Now →
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Live Exam Engine Simulator Preview */}
        <section id="simulator" className="my-24 text-left">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Experience the Live Exam Engine
            </h2>
            <p className="text-slate-400 mt-2">Switch between competitive exam modes in real-time below.</p>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 p-1.5 bg-black/40 rounded-2xl border border-white/5">
              <button
                onClick={() => setActiveTab("cbt")}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === "cbt"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                🖥️ CBT Mode (PLAB / JEE / GATE)
              </button>
              <button
                onClick={() => setActiveTab("omr")}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === "omr"
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                📝 Pen-Paper OMR Mode (NEET)
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === "analytics"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                🎯 Weakness Retest Engine
              </button>
              <button
                onClick={() => setActiveTab("whatsapp")}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === "whatsapp"
                    ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                📱 Instant WhatsApp Reports
              </button>
            </div>

            {/* Tab Display Content */}
            {activeTab === "cbt" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                <div className="lg:col-span-2 space-y-4 bg-slate-950 p-6 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center pb-4 border-b border-white/10">
                    <span className="font-bold text-blue-400 text-xs sm:text-sm">PLAB 1 CLINICAL SCENARIO #14 • SECTION: GENERAL MEDICINE</span>
                    <span className="bg-slate-800 px-3 py-1 rounded-lg text-xs font-mono font-bold text-amber-400 border border-amber-400/30">
                      ⏱ 02:45:12
                    </span>
                  </div>
                  <div className="space-y-3">
                    <p className="text-slate-200 font-semibold text-sm sm:text-base leading-relaxed">
                      Q14. A 54-year-old male presents with sudden-onset crushing chest pain radiating to the left jaw. ECG reveals ST-segment elevation in leads II, III, and aVF. What is the definitive immediate management step?
                    </p>
                    <div className="space-y-2 pt-2">
                      {[
                        "Immediate Primary Percutaneous Coronary Intervention (PPCI)",
                        "Oral Clopidogrel 300mg & discharge home",
                        "High-dose intravenous Furosemide",
                        "Emergency Coronary Artery Bypass Graft (CABG)"
                      ].map((opt, i) => (
                        <div key={i} className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${i === 0 ? "bg-blue-600/20 border-blue-500 text-white font-bold" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}>
                          <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${i === 0 ? "bg-blue-600 border-blue-400 text-white font-bold" : "border-slate-600 text-slate-400"}`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="text-xs sm:text-sm font-medium">{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-xs font-semibold">
                        Mark for Review
                      </Button>
                      <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 text-xs font-semibold">
                        Clear Response
                      </Button>
                    </div>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 text-xs">
                      Save & Next →
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-950 p-6 rounded-2xl border border-white/10 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question Status Palette</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-9 rounded-lg flex items-center justify-center font-bold text-xs border ${
                          i === 0
                            ? "bg-emerald-600 border-emerald-400 text-white"
                            : i === 1
                            ? "bg-purple-600 border-purple-400 text-white"
                            : i === 2
                            ? "bg-rose-600 border-rose-400 text-white"
                            : "bg-slate-800 border-slate-700 text-slate-400"
                        }`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 pt-4 border-t border-white/10 text-xs text-slate-400">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Answered (1)</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500"></span> Unanswered (1)</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Marked for Review (1)</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-700"></span> Not Visited (12)</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "omr" && (
              <div className="bg-slate-950 p-6 sm:p-8 rounded-2xl border border-white/10 animate-fade-in-up space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-lg font-bold text-purple-400">NEET UG Pen & Paper OMR Bubble Simulator</h3>
                    <p className="text-xs text-slate-400">Interactive bubble sheet grid for NEET, Bank PO & Pen-Paper mock exams.</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
                    NEET 200 Questions Template
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((qNum) => (
                    <div key={qNum} className="p-3.5 bg-slate-900/80 rounded-xl border border-white/5 flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-slate-300">Q{qNum}.</span>
                      <div className="flex gap-1.5">
                        {["A", "B", "C", "D"].map((choice) => (
                          <div
                            key={choice}
                            className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold cursor-pointer transition-all ${
                              qNum === 1 && choice === "B"
                                ? "bg-purple-600 border-purple-400 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)] scale-110"
                                : qNum === 3 && choice === "D"
                                ? "bg-purple-600 border-purple-400 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)] scale-110"
                                : "border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-500"
                            }`}
                          >
                            {choice}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="bg-slate-950 p-6 sm:p-8 rounded-2xl border border-white/10 animate-fade-in-up space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-400">Automated Weakness Detection & Adaptive Retest</h3>
                    <p className="text-xs text-slate-400">Automatically identifies weak topics and builds instant targeted practice modules.</p>
                  </div>
                  <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-5 text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    ⚡ Generate Adaptive Retest
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Strong Topics (&gt;75%)</span>
                    <p className="text-lg font-bold text-white mt-1">Cardiology, Electrodynamics</p>
                    <p className="text-xs text-slate-400 mt-2">Accuracy: 88.5%</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Developing (50%-75%)</span>
                    <p className="text-lg font-bold text-white mt-1">Pharmacology, Calculus</p>
                    <p className="text-xs text-slate-400 mt-2">Accuracy: 62.0%</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Needs Attention (&lt;50%)</span>
                    <p className="text-lg font-bold text-white mt-1">Nephrology, Genetics</p>
                    <p className="text-xs text-slate-400 mt-2">Accuracy: 34.2% • 1-Click Retest Ready</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "whatsapp" && (
              <div className="bg-slate-950 p-6 sm:p-8 rounded-2xl border border-white/10 animate-fade-in-up flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 space-y-4">
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                    AES-256 Encrypted Links
                  </span>
                  <h3 className="text-2xl font-bold text-white">Automated Parent WhatsApp Dispatch</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                    When a student completes an exam, our Notification Abstraction Service generates a tamper-proof AES-256 encrypted link and sends a WhatsApp message to linked parent numbers for instant report viewing.
                  </p>
                </div>
                <div className="w-full md:w-80 p-5 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 space-y-3 font-sans">
                  <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/20">
                    <span className="text-lg">💬</span>
                    <span className="text-xs font-bold text-emerald-400">Astra Assistant Bot</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl text-xs space-y-1.5 text-slate-200">
                    <p className="font-bold text-emerald-300">📊 New Exam Result Declared!</p>
                    <p>Student: <span className="font-bold text-white">Dr. Ananya Roy</span></p>
                    <p>Exam: Astra Mock Test #04</p>
                    <p>Score: <span className="font-bold text-emerald-400">168 / 180</span> (Passed)</p>
                    <p className="text-[10px] text-blue-400 underline pt-1 font-mono">
                      https://astra.exam/report/enc_token_9x72...
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Why Choose Astra Exam Platform Comparison Matrix */}
        <section id="why-us" className="my-24">
          <div className="text-center mb-16">
            <span className="px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
              Superior Technology
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-3">
              Why Astra vs Traditional Apps
            </h2>
            <p className="text-slate-400 mt-2 text-base max-w-2xl mx-auto">
              Compare our military-grade assessment infrastructure with standard quiz scripts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Astra Card */}
            <div className="p-8 rounded-3xl bg-blue-950/40 border border-blue-500/40 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-blue-500/20">
                <h3 className="text-2xl font-black text-white flex items-center gap-2">
                  <span className="text-blue-400">⚡</span> Astra Engine
                </h3>
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold">
                  RECOMMENDED
                </span>
              </div>
              <ul className="space-y-4 text-sm text-slate-200">
                {[
                  "True-to-life CBT exam software replica matching GMC UK & NTA screens",
                  "0ms latency local autosave with cloud background sync",
                  "Full-screen lockdown anti-cheat & tab-switch proctoring",
                  "1-Click automated weakness retest generator",
                  "Instant AES-256 encrypted parent WhatsApp dispatch",
                  "Multi-tenant white-label support for coaching institutes"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Traditional Platforms Card */}
            <div className="p-8 rounded-3xl bg-slate-900/40 border border-white/10 backdrop-blur-2xl opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <h3 className="text-2xl font-black text-slate-400 flex items-center gap-2">
                  <span>⚠️</span> Generic Quiz Platforms
                </h3>
                <span className="px-3 py-1 rounded-full bg-white/5 text-slate-500 text-xs font-bold">
                  OUTDATED
                </span>
              </div>
              <ul className="space-y-4 text-sm text-slate-400">
                {[
                  "Generic mobile app layouts with non-standard timers",
                  "Loss of responses if internet disconnects during test",
                  "No window blur detection or anti-cheat proctoring",
                  "Static scorecards without topic-level weakness diagnostics",
                  "Manual PDF download links that get lost in chat groups",
                  "Single rigid template without institute custom branding"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 4-Step How It Works Journey */}
        <section className="my-24">
          <div className="text-center mb-16">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              Simple 4-Step Workflow
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-3">
              How You Achieve 99%+ Percentile
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { step: "01", title: "Select Exam Package", desc: "Choose PLAB 1, NEET UG, JEE or institute test series.", color: "border-blue-500/40 text-blue-400" },
              { step: "02", title: "Attempt Real CBT", desc: "Experience 100% realistic exam screen interface & timers.", color: "border-purple-500/40 text-purple-400" },
              { step: "03", title: "Get AI Diagnostics", desc: "Analyze chapter accuracy & time spent per question.", color: "border-emerald-500/40 text-emerald-400" },
              { step: "04", title: "Target Weak Retests", desc: "Generate 1-click retest modules to lock in maximum score.", color: "border-amber-500/40 text-amber-400" }
            ].map((st, i) => (
              <div key={i} className={`p-6 rounded-3xl bg-slate-900/60 border ${st.color} backdrop-blur-xl space-y-3 relative`}>
                <span className={`text-4xl font-black ${st.color} opacity-40`}>{st.step}</span>
                <h3 className="text-lg font-bold text-white">{st.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Student Testimonials */}
        <section id="reviews" className="my-24">
          <div className="text-center mb-16">
            <span className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              Verified Aspirant Feedback
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-3">
              Loved by Top Rankers
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((t, i) => (
              <div key={i} className="p-8 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-6 text-left hover:border-blue-500/40 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex text-amber-400 text-sm">★★★★★</div>
                    <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold uppercase">
                      {t.rankBadge}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed italic">
                    "{t.text}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xl">
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{t.name}</h4>
                    <p className="text-[11px] text-slate-400">{t.exam} • {t.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Accordion FAQ Section */}
        <section id="faq" className="my-24 max-w-4xl mx-auto text-left">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-400 mt-2 text-sm">Got questions? We have answers.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md cursor-pointer hover:bg-slate-900/90 transition-all"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-100 text-sm sm:text-base">{faq.q}</h4>
                  <span className="text-blue-400 text-xl font-bold">{openFaq === idx ? "−" : "+"}</span>
                </div>
                {openFaq === idx && (
                  <p className="mt-4 text-slate-300 text-xs sm:text-sm leading-relaxed border-t border-white/5 pt-4 animate-fade-in-up">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="my-20 p-10 sm:p-16 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 border border-blue-500/30 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Ready to Crack Your Competitive Exam?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Join 15,000+ medical and engineering aspirants practicing on Astra Exam Platform today. Get instant access to full length CBT & OMR mock tests.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto px-8 h-14 text-base font-bold bg-white text-blue-950 hover:bg-slate-100 shadow-xl rounded-xl">
                  ⚡ Launch Free Mock Test Now
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 h-14 text-base font-bold border-white/30 text-white hover:bg-white/10 rounded-xl">
                  🔑 Student Login
                </Button>
              </Link>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        </section>
      </main>

      {/* Floating Action Suite */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Floating AI Assistant Trigger */}
        <button
          onClick={() => setAiModalOpen(true)}
          className="p-3.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.5)] hover:scale-110 transition-transform flex items-center gap-2 group"
          title="Ask AI Study Assistant"
        >
          <span className="text-lg">🤖</span>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-xs font-bold px-1">
            Ask AI Assistant
          </span>
        </button>

        {/* Floating WhatsApp Support Trigger */}
        <a
          href="https://wa.me/919899401931?text=Hi%20Astra%20Team%2C%20I%20have%20a%20query%20regarding%20mock%20tests."
          target="_blank"
          rel="noopener noreferrer"
          className="p-3.5 rounded-full bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:scale-110 transition-transform flex items-center gap-2 group"
          title="Chat on WhatsApp"
        >
          <span className="text-lg">💬</span>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-xs font-bold px-1">
            WhatsApp Support
          </span>
        </a>

        {/* Back to Top */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="p-3 rounded-full bg-slate-900 border border-white/20 text-slate-300 hover:text-white shadow-xl hover:bg-slate-800 transition-all text-xs font-bold"
            title="Back to Top"
          >
            ↑
          </button>
        )}
      </div>

      {/* Floating AI Study Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in-up">
          <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <h3 className="font-bold text-white text-base">Astra AI High-Yield Assistant</h3>
              </div>
              <button
                onClick={() => { setAiModalOpen(false); setAiAnswer(null); }}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">Ask any exam question or topic query for instant AI breakdown:</p>

            <form onSubmit={handleAiAsk} className="space-y-3">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="e.g. What is the immediate management for STEMI?"
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
              />
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs h-10">
                Ask AI Assistant →
              </Button>
            </form>

            {aiAnswer && (
              <div className="p-4 rounded-xl bg-purple-950/50 border border-purple-500/30 text-xs text-slate-200 space-y-2">
                <span className="font-bold text-purple-300">AI Breakdown:</span>
                <p className="leading-relaxed">{aiAnswer}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modern Multi-Column Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-16 relative z-10 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">
                A
              </div>
              <span className="font-bold text-white text-base">Astra - Exam Platform</span>
            </div>
            <p className="leading-relaxed text-slate-400">
              The ultimate multi-tenant CBT & OMR assessment engine. Built for medical doctors, engineering aspirants, and coaching institutes worldwide.
            </p>
            <p className="text-[11px] text-slate-500">
              © 2026 Astra Exam Platform Inc. All rights reserved.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Exam Portals</h4>
            <ul className="space-y-2">
              <li><a href="#test-series" className="hover:text-white transition-colors">PLAB 1 / UK MLA Scenarios</a></li>
              <li><a href="#test-series" className="hover:text-white transition-colors">NEET UG Pen & Paper OMR</a></li>
              <li><a href="#test-series" className="hover:text-white transition-colors">JEE Main & Advanced CBT</a></li>
              <li><a href="#test-series" className="hover:text-white transition-colors">GATE Scientific Calculator Drills</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Platform Features</h4>
            <ul className="space-y-2">
              <li><a href="#simulator" className="hover:text-white transition-colors">Real CBT Screen Simulator</a></li>
              <li><a href="#simulator" className="hover:text-white transition-colors">Proctoring Anti-Cheat Engine</a></li>
              <li><a href="#simulator" className="hover:text-white transition-colors">AI Weakness Retest Generator</a></li>
              <li><a href="#simulator" className="hover:text-white transition-colors">Encrypted WhatsApp Reports</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Support & Contact</h4>
            <p className="leading-relaxed">
              📍 Kalp Business Centre, City Light Road, Surat, Gujarat, 395007<br />
              📞 +91 98994 01931<br />
              ✉️ support@astra.exam
            </p>
            <div className="flex gap-4 pt-2 text-sm text-slate-300">
              <span>🌐</span> <span>📱</span> <span>💼</span> <span>✉️</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

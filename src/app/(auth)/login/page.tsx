"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, User, Phone, Sparkles, ArrowRight, ShieldCheck, Users, GraduationCap, Shield } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  
  // Sign in fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign up fields
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState<"STUDENT" | "PARENT" | "MENTOR">("STUDENT");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
      setIsLoading(false);
    } else {
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      const role = sessionData?.user?.role;
      
      toast.success("Welcome back!");
      if (role === "ADMIN" || role === "INSTITUTE_ADMIN" || role === "SUPER_ADMIN") {
        router.push("/admin");
      } else if (role === "MENTOR" || role === "FACULTY") {
        router.push("/mentor/students");
      } else if (role === "PARENT") {
        router.push("/dashboard/parent");
      } else {
        router.push("/student");
      }
      router.refresh();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email: signupEmail,
          phone: mobile,
          password: signupPassword,
          role: signupRole
        })
      });

      if (res.ok) {
        toast.success(`Account created as ${signupRole}! Signing you in...`);
        // Auto login
        const loginRes = await signIn("credentials", {
          email: signupEmail,
          password: signupPassword,
          redirect: false,
        });
        if (!loginRes?.error) {
          if (signupRole === "PARENT") {
            router.push("/dashboard/parent");
          } else if (signupRole === "MENTOR") {
            router.push("/mentor/students");
          } else {
            router.push("/student");
          }
        }
      } else {
        const text = await res.text();
        setError(text || "Failed to create account");
      }
    } catch (err) {
      setError("Error creating account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col lg:flex-row overflow-hidden relative selection:bg-blue-500 selection:text-white font-sans">
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Left Pane: Auth Forms */}
      <div className="w-full lg:w-1/2 p-6 sm:p-12 md:p-16 flex flex-col justify-between relative z-10 overflow-y-auto custom-scrollbar">
        
        {/* Brand Header */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-600/30 text-xl">
              M
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white block leading-tight">
                Mock Test Club
              </span>
              <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider block">Multi-Role Exam Platform</span>
            </div>
          </Link>
        </div>

        {/* Center Auth Card */}
        <div className="max-w-md w-full mx-auto space-y-6">
          
          {/* Sign In / Sign Up Tab Switcher */}
          <div className="bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 flex items-center">
            <button
              onClick={() => setAuthMode("signin")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                authMode === "signin"
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                authMode === "signup"
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form Header */}
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {authMode === "signin" ? "Sign In to Your Profile" : "Create Your Profile Account"}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {authMode === "signin" ? "Access Student, Parent Oversight, Teacher or Admin portal" : "Choose your account role (Student, Parent, Teacher) to register"}
            </p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {authMode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@astra.com, parent@apex.com, or mentor@astra.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Password</label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <label htmlFor="remember" className="text-xs text-slate-400 cursor-pointer">Remember my login session</label>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-600/30 text-xs flex items-center justify-center gap-2 mt-2"
              >
                <span>{isLoading ? "Signing in..." : "Sign In to Dashboard"}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* SIGN UP FORM WITH ROLE SELECTION */}
          {authMode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Account Role / Profile Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignupRole("STUDENT")}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                      signupRole === "STUDENT"
                        ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                        : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    👨‍🎓 Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupRole("PARENT")}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                      signupRole === "PARENT"
                        ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                        : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    👨‍👩‍👧 Parent
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignupRole("MENTOR")}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                      signupRole === "MENTOR"
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                        : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    🎓 Faculty
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Mobile Number</label>
                <div className="relative flex">
                  <span className="px-3 bg-slate-900 border border-r-0 border-white/10 rounded-l-xl text-xs text-slate-400 flex items-center justify-center font-semibold">
                    +91
                  </span>
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="10-digit mobile number"
                    required
                    className="w-full pl-3 pr-4 py-3 bg-slate-900/80 border border-white/10 rounded-r-xl text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-600/30 text-xs flex items-center justify-center gap-2 mt-2"
              >
                <span>{isLoading ? "Registering..." : `Register as ${signupRole}`}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* Quick-Fill Demo Login Buttons including Parent Profile */}
          <div className="pt-4 border-t border-white/10 space-y-2 text-center">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Quick Demo Login Presets</p>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => { setEmail("student@astra.com"); setPassword("password123"); setAuthMode("signin"); }}
                className="py-2 px-1.5 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 text-blue-300 rounded-lg transition-all font-semibold text-[10px]"
              >
                👨‍🎓 Student
              </button>
              <button
                type="button"
                onClick={() => { setEmail("parent@apex.com"); setPassword("password123"); setAuthMode("signin"); }}
                className="py-2 px-1.5 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-300 rounded-lg transition-all font-bold text-[10px]"
              >
                👨‍👩‍👧 Parent
              </button>
              <button
                type="button"
                onClick={() => { setEmail("mentor@astra.com"); setPassword("password123"); setAuthMode("signin"); }}
                className="py-2 px-1.5 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 rounded-lg transition-all font-semibold text-[10px]"
              >
                🎓 Teacher
              </button>
              <button
                type="button"
                onClick={() => { setEmail("admin@astra.com"); setPassword("password123"); setAuthMode("signin"); }}
                className="py-2 px-1.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 rounded-lg transition-all font-semibold text-[10px]"
              >
                🔑 Admin
              </button>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <p className="text-[10px] text-slate-500 text-center mt-8">
          © 2026 Astra - Exam Platform • Multi-Tenant CBT Engine
        </p>

      </div>

      {/* Right Pane: Visual Graphic Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900/30 via-indigo-900/30 to-slate-900/90 border-l border-white/10 p-12 flex-col justify-center items-center text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-md space-y-6">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-2xl shadow-blue-500/30 border border-white/20">
            <Sparkles className="w-10 h-10" />
          </div>

          <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
            Complete Multi-Profile Platform
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            Integrated portals for Students, Teachers, Parents, and Admins with real-time CBT exams, automated parent WhatsApp dispatches, and weakness diagnostics.
          </p>

          <div className="pt-6 grid grid-cols-2 gap-3 text-left">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <p className="font-bold text-white">👨‍👩‍👧 Parent Oversight</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Instant WhatsApp reports, rank tracking & PDF report cards</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <p className="font-bold text-white">🎓 Teacher & CBT Hub</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Candidate segregation, test review & proctored requests</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

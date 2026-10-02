"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const errorText = await res.text();
        setError(errorText || "Registration failed");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 font-sans text-slate-100 overflow-hidden relative selection:bg-blue-500 selection:text-white">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-600/20 blur-[120px] rounded-full pointer-events-none" />
        
        <main className="flex-1 flex flex-col justify-center items-center relative z-10 px-6 py-12">
          <div className="w-full max-w-md bg-white/[0.03] border border-white/10 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-2xl text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
              ✓
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">Registration Successful!</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Your account has been created successfully. For security and verification purposes, it requires mentor approval before you can log in.
            </p>
            <Button onClick={() => router.push("/login")} className="w-full h-12 bg-white text-slate-900 hover:bg-slate-200 font-semibold rounded-xl transition-all">
              Return to Login
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 font-sans text-slate-100 overflow-hidden relative selection:bg-blue-500 selection:text-white">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-indigo-600/20 blur-[100px] rounded-full pointer-events-none" />

      {/* Navbar Minimal */}
      <nav className="relative z-10 p-6 w-full max-w-7xl mx-auto flex items-center justify-center sm:justify-start">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">
            A
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Astra Exam Platform
          </span>
        </Link>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center relative z-10 px-6 py-12">
        <div className="w-full max-w-md bg-white/[0.03] border border-white/10 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-2xl animate-fade-in-up">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
              Create an Account
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              Join the Astra Exam Platform
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-3">
              <span className="text-xl">⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300 ml-1">Full Name</label>
              <input 
                name="name" 
                type="text" 
                required 
                className="w-full bg-slate-900/50 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600" 
                placeholder="Dr. John Doe" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300 ml-1">Email Address</label>
              <input 
                name="email" 
                type="email" 
                required 
                className="w-full bg-slate-900/50 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600" 
                placeholder="student@example.com" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300 ml-1">Password</label>
              <input 
                name="password" 
                type="password" 
                required 
                className="w-full bg-slate-900/50 border border-slate-700 text-white p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600" 
                placeholder="••••••••" 
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 mt-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] font-semibold text-base" 
              disabled={loading}
            >
              {loading ? "Creating account..." : "Register"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-medium">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

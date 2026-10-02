"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  Building2, 
  Users, 
  Layers, 
  ShoppingBag, 
  Target, 
  CheckCircle2, 
  TrendingUp, 
  Send, 
  ShieldCheck, 
  Plus, 
  BarChart2, 
  BookOpen
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 148,
    totalFaculty: 12,
    totalBatches: 6,
    activeExams: 18,
    revenue: "₹3,42,000",
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white tracking-tight">Apex Academy Admin</h1>
            <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-md border border-blue-500/30">
              White-Label SaaS Tenant
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">Multi-tenant institute governance, batches, user roles, exam policies & WhatsApp logs</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/organization">
            <Button variant="outline" className="bg-white/5 border-white/10 text-slate-200 text-xs font-bold h-10 rounded-xl">
              Branding & Domain
            </Button>
          </Link>
          <Link href="/admin/batches">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold h-10 px-5 rounded-xl shadow-lg shadow-blue-600/30">
              <Plus className="w-4 h-4 mr-1" />
              Create Batch
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enrolled Students</p>
          <p className="text-3xl font-black text-white mt-1">{stats.totalStudents}</p>
        </div>

        <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 backdrop-blur-md">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Faculty Mentors</p>
          <p className="text-3xl font-black text-blue-300 mt-1">{stats.totalFaculty}</p>
        </div>

        <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/10 backdrop-blur-md">
          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Active Batches</p>
          <p className="text-3xl font-black text-purple-300 mt-1">{stats.totalBatches}</p>
        </div>

        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Published CBTs</p>
          <p className="text-3xl font-black text-amber-300 mt-1">{stats.activeExams}</p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Total Revenue</p>
          <p className="text-3xl font-black text-emerald-300 mt-1">{stats.revenue}</p>
        </div>

      </div>

      {/* Main Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Quick Governance Links (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            Academy Governance & Modules
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <Link href="/admin/organization">
              <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-slate-900/90 hover:border-blue-500/30 transition-all group cursor-pointer space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base group-hover:text-blue-400 transition-colors">Organization & White-Label</h3>
                <p className="text-xs text-slate-400">Configure institute logo, primary/secondary colors, custom domain & WhatsApp keys.</p>
              </div>
            </Link>

            <Link href="/admin/users">
              <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-slate-900/90 hover:border-blue-500/30 transition-all group cursor-pointer space-y-2">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base group-hover:text-purple-400 transition-colors">User & Parent Linkage</h3>
                <p className="text-xs text-slate-400">Manage students, faculty accounts, role RBAC, and parent account linkage.</p>
              </div>
            </Link>

            <Link href="/admin/batches">
              <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-slate-900/90 hover:border-blue-500/30 transition-all group cursor-pointer space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">Batch Management</h3>
                <p className="text-xs text-slate-400">Create batches, assign target exam categories (JEE, NEET, GATE), and lead faculty.</p>
              </div>
            </Link>

            <Link href="/admin/packages">
              <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-slate-900/90 hover:border-blue-500/30 transition-all group cursor-pointer space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors">Test Package Marketplace</h3>
                <p className="text-xs text-slate-400">Create test series packages, pricing, validity duration & public student store listing.</p>
              </div>
            </Link>

          </div>
        </div>

        {/* WhatsApp & Proctoring Status (1 col) */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-400" />
            WhatsApp Notification Dispatch
          </h2>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Provider Status</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded">
                CONNECTED
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex justify-between">
                <span>Dispatches Today:</span>
                <strong className="text-white">48 Sent</strong>
              </p>
              <p className="flex justify-between">
                <span>Report Encrypted Tokens:</span>
                <strong className="text-emerald-400">AES-256 Active</strong>
              </p>
            </div>

            <Link href="/admin/notifications">
              <Button className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-xs font-bold h-9 mt-2">
                View Dispatch Logs →
              </Button>
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}

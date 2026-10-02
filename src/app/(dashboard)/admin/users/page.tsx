"use client";

import { useState } from "react";
import { Users, Search, Plus, UserPlus, Shield, CheckCircle2, UserCheck, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const usersList = [
    { id: "u-1", name: "Prajwal Skanda S", email: "skanda204@gmail.com", role: "STUDENT", batch: "JEE 2026 Batch A", status: "APPROVED" },
    { id: "u-2", name: "Dr. Rajesh Sharma", email: "mentor@astra.com", role: "FACULTY", batch: "Faculty Lead", status: "APPROVED" },
    { id: "u-3", name: "Srinivasa S", email: "parent@astra.com", role: "PARENT", batch: "Linked to Prajwal", status: "APPROVED" },
    { id: "u-4", name: "Ananya Roy", email: "ananya@student.com", role: "STUDENT", batch: "NEET Achievers 2026", status: "PENDING" },
  ];

  const filtered = usersList.filter(u => {
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesQuery = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesQuery;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">User Management</h1>
          <p className="text-sm text-slate-400 mt-1">Manage institute students, faculty mentors, parent relationships & account access</p>
        </div>

        <Button onClick={() => toast.info("User creation modal opened")} className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 px-5 rounded-xl shadow-lg shadow-blue-600/30 text-xs">
          <UserPlus className="w-4 h-4 mr-2" />
          Add New User
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2">
          {["ALL", "STUDENT", "FACULTY", "PARENT"].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                roleFilter === role
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Search user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[10px] text-slate-400 uppercase bg-black/40 border-b border-white/10">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Batch / Detail</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="p-3 font-semibold text-white">
                    <div>
                      <p className="font-bold text-slate-200">{u.name}</p>
                      <p className="text-[10px] text-slate-400">{u.email}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold rounded uppercase">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{u.batch}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      u.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <Button variant="outline" className="bg-white/5 border-white/10 text-[10px] h-7 px-2 text-slate-300 hover:bg-white/10">
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

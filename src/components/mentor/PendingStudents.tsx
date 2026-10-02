"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export function PendingStudents() {
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/pending")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setStudents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleApproval = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      await fetch(`/api/users/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Failed to approve/reject", error);
    }
  };

  if (loading) return <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl text-slate-400">Loading pending students...</div>;

  return (
    <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl text-slate-100">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Pending Approvals</h2>
        {students.length > 0 && (
          <span className="text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-md border border-amber-500/30">
            {students.length} Pending
          </span>
        )}
      </div>

      {students.length === 0 ? (
        <div className="p-8 text-center text-slate-500 border border-white/5 rounded-xl bg-white/[0.01]">
          No pending students.
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <div key={student.id} className="flex items-center justify-between p-4 border border-white/10 rounded-xl bg-slate-900/40 hover:bg-slate-900/60 transition-colors">
              <div>
                <p className="font-semibold text-slate-200">{student.name}</p>
                <p className="text-sm text-slate-400">{student.email}</p>
              </div>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  className="text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300" 
                  onClick={() => handleApproval(student.id, "REJECTED")}
                >
                  Reject
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
                  onClick={() => handleApproval(student.id, "APPROVED")}
                >
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

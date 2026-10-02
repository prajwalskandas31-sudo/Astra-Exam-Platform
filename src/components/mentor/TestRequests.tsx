"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function TestRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/requests");
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      alert("Failed to update request.");
    }
  };

  if (loading) return <div className="text-slate-500">Loading test requests...</div>;

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-xl text-slate-100">
      <h2 className="text-xl font-bold mb-6">Test Requests</h2>
      {requests.length === 0 ? (
        <p className="text-slate-500">No pending test requests.</p>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div>
                <p className="font-bold">{req.user.name}</p>
                <p className="text-sm text-slate-400">{req.user.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                    {req.count} {req.category} Tests
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleAction(req.id, 'APPROVED')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                >
                  Approve
                </Button>
                <Button 
                  onClick={() => handleAction(req.id, 'REJECTED')}
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-8"
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

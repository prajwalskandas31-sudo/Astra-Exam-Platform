"use client";

import { useState } from "react";
import { MessageSquare, Send, Users, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function MentorMessagesPage() {
  const [recipientGroup, setRecipientGroup] = useState("All Batches");
  const [title, setTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !messageBody) {
      toast.error("Please enter both a title and message body.");
      return;
    }

    setSending(true);
    setTimeout(() => {
      toast.success(`Announcement broadcasted to ${recipientGroup} successfully!`);
      setTitle("");
      setMessageBody("");
      setSending(false);
    }, 800);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Announcements & Messages</h1>
        <p className="text-sm text-slate-400 mt-1">Broadcast important exam alerts, study schedules & mentor guidance to student batches</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Column (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 border-b border-white/10 pb-4">
            <Send className="w-5 h-5 text-blue-400" />
            Send New Announcement
          </h2>

          <form onSubmit={handleSendAnnouncement} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Target Batch / Audience</label>
              <select
                value={recipientGroup}
                onChange={(e) => setRecipientGroup(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
              >
                <option value="All Batches">All Batches (Broadcast)</option>
                <option value="JEE 2026 Batch A">JEE 2026 Batch A</option>
                <option value="NEET Achievers 2026">NEET Achievers 2026</option>
                <option value="COMEDK FastTrack">COMEDK FastTrack</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Announcement Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New Physics Practice Test Published"
                required
                className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Message Content</label>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Write message content for students..."
                required
                className="w-full p-4 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none min-h-[140px]"
              />
            </div>

            <Button
              type="submit"
              disabled={sending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-blue-600/30 text-xs flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending..." : "Broadcast Announcement"}
            </Button>

          </form>
        </div>

        {/* History Column (1 col) */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            Sent Announcements
          </h3>

          <div className="space-y-3">
            {[
              { title: "Welcome to the Platform!", target: "All Batches", date: "2026-01-15" },
              { title: "New Physics Exam Available", target: "JEE 2026 Batch A", date: "2026-01-14" },
            ].map((sent, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] space-y-1">
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[9px] font-bold rounded border border-purple-500/30 uppercase">
                  {sent.target}
                </span>
                <p className="font-bold text-xs text-white mt-1">{sent.title}</p>
                <p className="text-[10px] text-slate-500 text-right">{sent.date}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

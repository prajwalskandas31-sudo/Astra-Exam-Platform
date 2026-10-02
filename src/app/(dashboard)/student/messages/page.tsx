"use client";

import { useState } from "react";
import { MessageSquare, Search, User, ShieldAlert, Bell } from "lucide-react";

export default function MessagesPage() {
  const [selectedMessageId, setSelectedMessageId] = useState<string>("msg-1");
  const [searchQuery, setSearchQuery] = useState("");

  const messages = [
    {
      id: "msg-1",
      sender: "Admin",
      senderRole: "Admin",
      title: "Welcome to the Platform!",
      preview: "Welcome to our exam platform. We are excited to have you here...",
      body: "Dear Student,\n\nWelcome to Mock Test Club! You have been successfully assigned to your coaching institute batch. You can now access full-length CBT mock tests, chapter practice modules, and detailed rank analytics.\n\nBest regards,\nPlatform Administration",
      date: "2026-01-15",
      isNew: true,
      color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    },
    {
      id: "msg-2",
      sender: "Faculty",
      senderRole: "Faculty",
      title: "New Exam Available",
      preview: "A new physics exam has been published. Please check your dashboard...",
      body: "Dear Student,\n\nA new physics chapter mock exam 'Ray Optics & Wave Optics' has been published by your faculty. Please attempt it before the upcoming weekend deadline.\n\nGood luck!",
      date: "2026-01-14",
      isNew: true,
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
    {
      id: "msg-3",
      sender: "System",
      senderRole: "System",
      title: "Exam Results Published",
      preview: "Your results for Mathematics Final Exam are now available...",
      body: "Your comprehensive score report and question analysis for Mathematics Mock Exam are now ready. Check your 'My Results' page or click the link sent via WhatsApp.",
      date: "2026-01-10",
      isNew: false,
      color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    },
  ];

  const activeMessage = messages.find(m => m.id === selectedMessageId);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Messages</h1>
        <p className="text-sm text-slate-400 mt-1">Notifications and direct announcements from institute admins & mentors</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Inbox List (1 col) */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-white text-sm">Inbox</h3>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => setSelectedMessageId(msg.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedMessageId === msg.id
                    ? 'bg-blue-600/20 border-blue-500/40 shadow-md'
                    : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${msg.color}`}>
                      {msg.sender.charAt(0)}
                    </span>
                    <span className="font-bold text-xs text-white">{msg.sender}</span>
                  </div>
                  {msg.isNew && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-600 text-white rounded">
                      New
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-xs text-slate-200 mt-2 truncate">{msg.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{msg.preview}</p>
                <p className="text-[9px] text-slate-500 mt-2 text-right">{msg.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Message Viewer Pane (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-white/10 rounded-2xl p-6 min-h-[400px] flex flex-col justify-between">
          {activeMessage ? (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${activeMessage.color}`}>
                    {activeMessage.senderRole}
                  </span>
                  <span className="text-xs text-slate-400">{activeMessage.date}</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">{activeMessage.title}</h2>
              </div>
              <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                {activeMessage.body}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-500 space-y-3">
              <MessageSquare className="w-10 h-10" />
              <p className="text-sm font-semibold">Select a message</p>
              <p className="text-xs">Choose a message from the left inbox list to view its contents</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

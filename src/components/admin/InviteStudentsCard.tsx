"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Link2, MessageCircle, RefreshCw } from "lucide-react";
import { Btn, Card, CardHeader, Modal } from "@/components/ui/kit";
import { apiFetch, useApi } from "@/lib/fetcher";

/** The institute's sign-up link: students and parents who open it join this institute. */
export function InviteStudentsCard({ isAdmin }: { isAdmin: boolean }) {
  const { data, setData, error } = useApi<{ code: string; url: string }>("/api/organization/join-code");
  const [confirm, setConfirm] = useState(false);
  const [rotating, setRotating] = useState(false);
  if (error || !data) return null;

  const message = `Join our institute on Astra for mock tests and results.\n\nSign up here: ${data.url}\n(Institute code: ${data.code})`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
    }
  };
  const rotate = async () => {
    setRotating(true);
    try {
      setData(await apiFetch<{ code: string; url: string }>("/api/organization/join-code", { method: "POST" }));
      toast.success("New link issued. The old link no longer works.");
      setConfirm(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't issue a new link");
    } finally {
      setRotating(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Invite students & parents" icon={Link2} description="Share this link in your batch WhatsApp groups. Anyone who signs up with it joins your institute." />
      <div className="space-y-3 p-5">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">
          <code className="min-w-0 flex-1 truncate text-xs text-blue-200">{data.url}</code>
          <span className="shrink-0 font-mono text-xs tracking-widest text-slate-400">{data.code}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn size="sm" onClick={copy}><Copy className="h-4 w-4" />Copy link</Btn>
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
            <Btn size="sm" variant="success"><MessageCircle className="h-4 w-4" />Share on WhatsApp</Btn>
          </a>
          {isAdmin && (
            <Btn size="sm" variant="ghost" onClick={() => setConfirm(true)}><RefreshCw className="h-4 w-4" />New link</Btn>
          )}
        </div>
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        title="Issue a new sign-up link?"
        description="The current link and code stop working immediately. Students who already joined are not affected."
        footer={
          <>
            <Btn variant="secondary" onClick={() => setConfirm(false)}>Cancel</Btn>
            <Btn variant="danger" loading={rotating} onClick={rotate}>Issue new link</Btn>
          </>
        }
      />
    </Card>
  );
}

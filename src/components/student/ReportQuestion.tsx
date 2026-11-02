"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { Btn, Field, Modal, inputClass } from "@/components/ui/kit";
import { apiFetch } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

const REASONS = [
  { id: "WRONG_ANSWER", label: "The answer key is wrong" },
  { id: "UNCLEAR", label: "Question or options are unclear" },
  { id: "TYPO", label: "Typo or formatting problem" },
  { id: "OUTDATED", label: "Outdated guideline or fact" },
  { id: "OTHER", label: "Something else" },
];

/** Flag button + modal that sends a question error report to faculty. */
export function ReportQuestionButton({ questionId, className }: { questionId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("WRONG_ANSWER");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      await apiFetch("/api/question-reports", { method: "POST", json: { questionId, reason, details } });
      toast.success("Thanks — your report was sent to faculty");
      setSent(true);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send report");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={sent}
        className={cn("rounded-lg p-1 text-slate-500 hover:text-rose-300 disabled:text-rose-400/60", className)}
        aria-label={sent ? "Question reported" : "Report a problem with this question"}
        title={sent ? "Reported" : "Report a problem"}
      >
        <Flag className="h-4 w-4" />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report a problem"
        description="Faculty will review the question and fix it if needed."
        size="sm"
        footer={
          <>
            <Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn loading={sending} disabled={reason === "OTHER" && !details.trim()} onClick={submit}>Send report</Btn>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5" role="radiogroup" aria-label="Reason">
            {REASONS.map((r) => (
              <label key={r.id} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm", reason === r.id ? "border-blue-500/50 bg-blue-500/10 text-white" : "border-white/[0.08] text-slate-300")}>
                <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} className="accent-blue-500" />
                {r.label}
              </label>
            ))}
          </div>
          <Field label={reason === "OTHER" ? "Details" : "Details (optional)"} hint="e.g. which option should be correct, with a reference if you have one">
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={1000} className={inputClass} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

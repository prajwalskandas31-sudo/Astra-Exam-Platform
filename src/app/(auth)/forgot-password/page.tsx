"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Btn, Card, Field, inputClass } from "@/components/ui/kit";
import { apiFetch } from "@/lib/fetcher";

/** Two steps: request a code to the registered phone, then enter it with a new password. */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const request = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch<{ message: string }>("/api/auth/forgot-password", { method: "POST", json: { email } });
      setNotice(res.message);
      setStep("verify");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send a code");
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords don't match");
    setBusy(true);
    try {
      await apiFetch("/api/auth/forgot-password", { method: "PUT", json: { email, code, newPassword: password } });
      toast.success("Password changed — sign in with your new password");
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't reset password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md space-y-6 p-6 sm:p-8">
        <div className="space-y-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400"><KeyRound className="h-5 w-5" /></div>
          <h1 className="text-xl font-bold text-white">Reset your password</h1>
          <p className="text-sm text-slate-400">
            {step === "request"
              ? "We'll send a 6-digit code by WhatsApp or SMS to the phone number on your account."
              : notice}
          </p>
        </div>

        {step === "request" ? (
          <form onSubmit={request} className="space-y-4">
            <Field label="Account email">
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </Field>
            <Btn type="submit" loading={busy} className="w-full">Send code</Btn>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-4">
            <Field label="6-digit code">
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={`${inputClass} font-mono tracking-[0.4em]`} />
            </Field>
            <Field label="New password" hint="At least 8 characters">
              <input type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Confirm new password">
              <input type="password" minLength={8} required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
            </Field>
            <Btn type="submit" loading={busy} className="w-full">Set new password</Btn>
            <button type="button" onClick={() => setStep("request")} className="w-full text-xs text-slate-400 hover:text-white">Didn&apos;t get a code? Send another</button>
          </form>
        )}

        <div className="space-y-2 border-t border-white/[0.06] pt-4 text-xs text-slate-500">
          <p>No phone number on your account, or your institute hasn&apos;t set up WhatsApp/SMS? Ask your institute admin — they can reset your password from the Users page.</p>
          <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-blue-400 hover:text-blue-300"><ArrowLeft className="h-3 w-3" />Back to sign in</Link>
        </div>
      </Card>
    </div>
  );
}

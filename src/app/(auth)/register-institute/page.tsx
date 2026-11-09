"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Building2, CheckCircle2, Loader2 } from "lucide-react";

const CATEGORIES = ["PLAB", "NEET", "NEET PG", "JEE", "GATE", "AFCAT", "SSC", "Banking", "CUSTOM"];

const field = "w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300";

export default function RegisterInstitutePage() {
  const router = useRouter();
  const [form, setForm] = useState({ instituteName: "", name: "", email: "", phone: "", password: "" });
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register-institute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, examCategories: categories }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't create your institute");
        setLoading(false);
        return;
      }
      const login = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (login?.error) {
        router.push("/login");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-2">
        <section className="space-y-5 lg:pt-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Run your institute&apos;s mock tests on Astra</h1>
          <p className="text-sm leading-relaxed text-slate-300">Set up in minutes. Your students take real exam-style CBT and OMR tests; you get rankings and item analysis; parents get results on WhatsApp.</p>
          <ul className="space-y-2.5 text-sm text-slate-300">
            {[
              "Import students from a spreadsheet, or share one sign-up link",
              "Upload a PDF paper — AI turns it into a question bank",
              "Proctored CBT with autosave that survives bad internet",
              "Automatic results to students and parents",
            ].map((t) => (
              <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{t}</li>
            ))}
          </ul>
        </section>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h2 className="text-lg font-bold text-white">Create your institute</h2>
          <div>
            <label htmlFor="inst" className={label}>Institute name</label>
            <input id="inst" required value={form.instituteName} onChange={set("instituteName")} placeholder="e.g. Apex Medical Academy" className={field} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className={label}>Your name</label>
              <input id="name" required value={form.name} onChange={set("name")} autoComplete="name" className={field} />
            </div>
            <div>
              <label htmlFor="phone" className={label}>Mobile</label>
              <input id="phone" required value={form.phone} onChange={set("phone")} autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" className={field} />
            </div>
          </div>
          <div>
            <label htmlFor="email" className={label}>Work email</label>
            <input id="email" type="email" required value={form.email} onChange={set("email")} autoComplete="email" className={field} />
          </div>
          <div>
            <label htmlFor="password" className={label}>Password</label>
            <input id="password" type="password" required minLength={8} value={form.password} onChange={set("password")} autoComplete="new-password" placeholder="At least 8 characters" className={field} />
          </div>
          <fieldset>
            <legend className={label}>Exams you prepare students for</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const on = categories.includes(c);
                return (
                  <button
                    type="button"
                    key={c}
                    aria-pressed={on}
                    onClick={() => setCategories(on ? categories.filter((x) => x !== c) : [...categories, c])}
                    className={on ? "rounded-lg border border-blue-500 bg-blue-600/20 px-3 py-1.5 text-xs font-semibold text-blue-200" : "rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white"}
                  >
                    {c === "CUSTOM" ? "Other" : c}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>}
          <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create institute <ArrowRight className="h-4 w-4" /></>}
          </button>
          <p className="text-center text-xs text-slate-500">
            Already on Astra? <Link href="/login" className="font-semibold text-blue-400">Sign in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}

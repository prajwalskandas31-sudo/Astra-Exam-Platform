"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-1 items-center justify-center bg-slate-950 px-4 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-400">
          This page hit an unexpected error. If you were in an exam, your answers are saved — reload to continue.
        </p>
        {error.digest && <p className="mt-2 font-mono text-xs text-slate-600">Reference: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => unstable_retry()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
            Try again
          </button>
          <Link href="/dashboard" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5">
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

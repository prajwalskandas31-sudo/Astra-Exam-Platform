import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-1 items-center justify-center bg-slate-950 px-4 text-center">
      <div className="max-w-md">
        <p className="font-mono text-sm font-semibold text-blue-400">404</p>
        <h1 className="mt-2 text-xl font-bold text-white">Page not found</h1>
        <p className="mt-2 text-sm text-slate-400">The link may be old, or the page may have moved.</p>
        <Link href="/dashboard" className="mt-6 inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}

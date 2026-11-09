"use client";

// Replaces the root layout when it fails, so it can't rely on the app's CSS or fonts.
export default function GlobalError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#020617", color: "#e2e8f0", fontFamily: "system-ui, sans-serif", padding: 16, textAlign: "center" }}>
        <title>Something went wrong</title>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>Please try again. If you were in an exam, your answers are saved.</p>
          {error.digest && <p style={{ color: "#475569", fontSize: 12, fontFamily: "monospace" }}>Reference: {error.digest}</p>}
          <button
            onClick={() => unstable_retry()}
            style={{ marginTop: 12, background: "#2563eb", color: "white", border: 0, borderRadius: 12, padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session-check");
        const data = await res.json();

        if (data.sessionId && data.sessionId !== (session.user as any).sessionId) {
          console.warn("New session detected elsewhere. Logging out...");
          signOut({ callbackUrl: "/login?error=SessionInvalid" });
        }
      } catch (err) {
        console.error("Session check failed", err);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkSession, 30000);
    
    // Also check immediately
    checkSession();

    return () => clearInterval(interval);
  }, [session]);

  return <>{children}</>;
}

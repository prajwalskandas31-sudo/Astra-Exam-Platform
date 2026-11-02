"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";

/** Logs the user out when their account signs in elsewhere or is deactivated. */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const sessionId = session?.user?.sessionId;

  useEffect(() => {
    if (!sessionId) return;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session-check");
        if (!res.ok) return;
        const data = await res.json();
        if (data.active === false) {
          signOut({ callbackUrl: "/login?error=AccountDisabled" });
        } else if (data.sessionId && data.sessionId !== sessionId) {
          signOut({ callbackUrl: "/login?error=SessionInvalid" });
        }
      } catch {
        // Offline or transient failure; try again on the next tick
      }
    };

    const interval = setInterval(checkSession, 30000);
    checkSession();
    return () => clearInterval(interval);
  }, [sessionId]);

  return <>{children}</>;
}

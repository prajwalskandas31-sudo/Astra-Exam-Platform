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

    // Every open tab polls, so keep this light: once a minute while visible, plus on return to the tab
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") checkSession();
    }, 60000 * (0.9 + Math.random() * 0.2));
    const onVisible = () => {
      if (document.visibilityState === "visible") checkSession();
    };
    document.addEventListener("visibilitychange", onVisible);
    checkSession();
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sessionId]);

  return <>{children}</>;
}

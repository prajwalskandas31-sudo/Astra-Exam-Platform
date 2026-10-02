"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { SessionGuard } from "./auth/SessionGuard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionGuard>
        {children}
        <Toaster position="top-center" richColors />
      </SessionGuard>
    </SessionProvider>
  );
}

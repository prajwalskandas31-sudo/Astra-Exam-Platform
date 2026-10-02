import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      organizationId?: string | null;
      sessionId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    organizationId?: string | null;
    sessionId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    organizationId?: string | null;
    sessionId?: string;
  }
}

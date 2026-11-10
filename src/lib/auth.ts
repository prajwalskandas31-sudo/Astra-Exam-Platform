import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
// Native bcrypt: runs on the libuv thread pool, so a login rush does not block the event loop
import * as bcrypt from "@node-rs/bcrypt";
import crypto from "crypto";
import { prisma } from "./prisma";
import { clientIp, isRateLimited, rateLimit } from "./rateLimit";
import { normalizeStudentCode } from "./institutes";

/**
 * Students can sign in with their institute's student ID instead of an email. IDs are unique
 * only within an institute, so when the same ID exists at two institutes the student is asked
 * for their institute code (join code or the institute's short name).
 */
async function findStudentById(identifier: string, institute?: string) {
  const code = normalizeStudentCode(identifier);
  if (!code) return null;
  const inst = institute?.trim();
  const students = await prisma.user.findMany({
    where: {
      studentCode: code,
      role: "STUDENT",
      ...(inst ? { organization: { OR: [{ joinCode: inst.toUpperCase().replace(/[^A-Z0-9]/g, "") }, { slug: inst.toLowerCase() }] } } : {}),
    },
    take: 2,
  });
  if (students.length > 1) throw new Error("InstituteRequired");
  return students[0] ?? null;
}

const LOGIN_FAILURES_ALLOWED = 10;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        institute: { label: "Institute code", type: "text" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const email = credentials.email.trim().toLowerCase();

        // Brute-force protection: 10 wrong passwords per account per 15 minutes, plus a per-IP
        // cap that is generous because a whole classroom or exam centre often shares one IP.
        const emailKey = `login:fail:${email}`;
        const ip = clientIp(req?.headers);
        const [emailLocked, byIp] = await Promise.all([
          isRateLimited(emailKey, LOGIN_FAILURES_ALLOWED),
          rateLimit(`login:ip:${ip}`, Number(process.env.LOGIN_IP_LIMIT) || 2000, 15 * 60),
        ]);
        if (emailLocked || !byIp.ok) throw new Error("TooManyAttempts");
        const failed = async () => {
          await rateLimit(emailKey, LOGIN_FAILURES_ALLOWED, 15 * 60);
          return null;
        };

        const user = email.includes("@")
          ? await prisma.user.findUnique({ where: { email } })
          : await findStudentById(email, credentials.institute);
        if (!user) return failed();

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) return failed();

        // Surface a distinct error so the login page can explain pending/rejected accounts
        if (user.status === "PENDING") throw new Error("AccountPending");
        if (user.status === "REJECTED") throw new Error("AccountRejected");

        // Single active session per account: SessionGuard logs out older sessions
        const sessionId = crypto.randomUUID();
        await prisma.user.update({
          where: { id: user.id },
          data: { sessionId }
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          sessionId
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.organizationId = user.organizationId;
        token.sessionId = user.sessionId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as string | null;
        session.user.sessionId = token.sessionId as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

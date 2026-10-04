import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const emailLower = credentials.email.trim().toLowerCase();
        const password = credentials.password;

        // 1. Try finding user in database
        let user = null;
        try {
          user = await prisma.user.findUnique({
            where: { email: emailLower }
          });
        } catch {
          // DB uninitialized or serverless environment without active DB connection
        }

        if (user) {
          let isPasswordValid = false;
          try {
            isPasswordValid = await bcrypt.compare(password, user.password);
          } catch {}

          // Fallback check for prototype password
          if (!isPasswordValid && password === "password123") {
            isPasswordValid = true;
          }

          if (isPasswordValid && user.status === "APPROVED") {
            const sessionId = Math.random().toString(36).substring(2, 15);
            try {
              await prisma.user.update({
                where: { id: user.id },
                data: { sessionId }
              });
            } catch {}

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              organizationId: user.organizationId,
              status: user.status,
              sessionId
            };
          }
        }

        // 2. Dummy credentials fallback (works in production Vercel & local without DB)
        if (password === "password123") {
          const dummyProfiles: Record<string, { id: string; name: string; role: string }> = {
            "student@astra.com": { id: "u-student-1", name: "Dr. Alex Vance", role: "STUDENT" },
            "student@plab.com": { id: "u-student-1", name: "Dr. Alex Vance", role: "STUDENT" },
            "student@apex.com": { id: "u-student-2", name: "Rahul Sharma", role: "STUDENT" },
            "mentor@astra.com": { id: "u-mentor-1", name: "Dr. Sarah Jenkins (Astra Mentor)", role: "MENTOR" },
            "mentor@plab.com": { id: "u-mentor-1", name: "Dr. Sarah Jenkins (Astra Mentor)", role: "MENTOR" },
            "admin@astra.com": { id: "u-admin-1", name: "Astra Platform Admin", role: "INSTITUTE_ADMIN" },
            "admin@plab.com": { id: "u-admin-1", name: "Astra Platform Admin", role: "INSTITUTE_ADMIN" },
            "admin@apex.com": { id: "u-admin-2", name: "Apex Director", role: "INSTITUTE_ADMIN" },
            "parent@astra.com": { id: "u-parent-1", name: "Mr. David Vance (Parent)", role: "PARENT" },
            "parent@plab.com": { id: "u-parent-1", name: "Mr. David Vance (Parent)", role: "PARENT" },
            "parent@apex.com": { id: "u-parent-2", name: "Mrs. Sunita Sharma", role: "PARENT" },
            "faculty@apex.com": { id: "u-faculty-1", name: "Prof. Sharma", role: "FACULTY" },
            "superadmin@platform.com": { id: "u-super-1", name: "Global Admin", role: "SUPER_ADMIN" },
          };

          const knownProfile = dummyProfiles[emailLower];
          let role = "STUDENT";
          let name = "Demo Student";
          let id = `u-demo-${Math.random().toString(36).substring(2, 7)}`;

          if (knownProfile) {
            id = knownProfile.id;
            name = knownProfile.name;
            role = knownProfile.role;
          } else if (emailLower.includes("admin")) {
            role = "INSTITUTE_ADMIN";
            name = "Demo Admin";
          } else if (emailLower.includes("mentor") || emailLower.includes("faculty") || emailLower.includes("teacher")) {
            role = "MENTOR";
            name = "Demo Mentor";
          } else if (emailLower.includes("parent")) {
            role = "PARENT";
            name = "Demo Parent";
          }

          const sessionId = Math.random().toString(36).substring(2, 15);
          return {
            id,
            email: emailLower,
            name,
            role,
            organizationId: "org-1",
            status: "APPROVED",
            sessionId
          };
        }

        return null;
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
  secret: process.env.NEXTAUTH_SECRET || "testing-string-secret-key-123456",
};

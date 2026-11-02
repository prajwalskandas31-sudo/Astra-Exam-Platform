import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { ADMIN_ROLES, STAFF_ROLES, homePathForRole, type AppRole } from "@/lib/roles";

// Optimistic, role-based routing. API routes still enforce authorization themselves.
const PORTAL_RULES: Array<{ prefix: string; roles: readonly AppRole[] }> = [
  { prefix: "/admin", roles: ADMIN_ROLES },
  { prefix: "/mentor", roles: STAFF_ROLES },
  { prefix: "/dashboard/parent", roles: ["PARENT", "SUPER_ADMIN"] },
  { prefix: "/student", roles: ["STUDENT"] },
  { prefix: "/exam", roles: ["STUDENT"] },
];

export default withAuth(
  function proxy(req) {
    const role = req.nextauth.token?.role as string | undefined;
    const path = req.nextUrl.pathname;

    // Generic /dashboard entry point: send each role to its own portal
    if (path === "/dashboard" || path === "/dashboard/") {
      return NextResponse.redirect(new URL(homePathForRole(role), req.url));
    }

    const rule = PORTAL_RULES.find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`));
    if (rule && !(rule.roles as readonly string[]).includes(role ?? "")) {
      return NextResponse.redirect(new URL(homePathForRole(role), req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard",
    "/admin/:path*",
    "/admin",
    "/mentor/:path*",
    "/mentor",
    "/student/:path*",
    "/student",
    "/exam/:path*",
  ],
};

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const role = token?.role;

    // Role-based route protection
    if (path.startsWith("/dashboard/super-admin") && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (path.startsWith("/dashboard/admin") && !["SUPER_ADMIN", "INSTITUTE_ADMIN"].includes(role as string)) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (
      (path.startsWith("/dashboard/faculty") || path.startsWith("/dashboard/mentor")) &&
      !["SUPER_ADMIN", "INSTITUTE_ADMIN", "FACULTY", "MENTOR"].includes(role as string)
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (path.startsWith("/dashboard/parent") && !["SUPER_ADMIN", "PARENT"].includes(role as string)) {
      return NextResponse.redirect(new URL("/login", req.url));
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
    "/exam/:path*"
  ],
};

import { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "./auth";
import type { AppRole } from "./roles";

type Guard = { session: Session; error?: never } | { session?: never; error: NextResponse };

/**
 * Resolve the current session and enforce an optional role allow-list.
 * Usage: const { session, error } = await requireRole(STAFF_ROLES); if (error) return error;
 */
export async function requireRole(roles?: readonly AppRole[]): Promise<Guard> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (roles && !(roles as readonly string[]).includes(session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Prisma `where` fragment that scopes a model with `organizationId` to the caller's tenant. */
export function tenantWhere(session: Session): { organizationId?: string | null } {
  if (session.user.role === "SUPER_ADMIN") return {};
  return { organizationId: session.user.organizationId ?? null };
}

/** Like tenantWhere, but also includes platform-wide rows (organizationId = null). */
export function tenantOrGlobalWhere(session: Session) {
  if (session.user.role === "SUPER_ADMIN") return {};
  const orgId = session.user.organizationId ?? null;
  return orgId ? { OR: [{ organizationId: orgId }, { organizationId: null }] } : { organizationId: null };
}

export function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

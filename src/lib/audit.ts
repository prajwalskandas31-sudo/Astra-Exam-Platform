import type { Session } from "next-auth";
import { prisma } from "./prisma";
import { clientIp } from "./rateLimit";

export interface AuditEntry {
  action: string;
  targetType?: string;
  targetId?: string | null;
  summary?: string;
}

/**
 * Record a staff/admin action in the institute's audit log. Never throws and never delays the
 * response by more than one insert; a failed log line must not fail the action it describes.
 */
export async function audit(session: Session, entry: AuditEntry, request?: Request) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: session.user.organizationId ?? null,
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email ?? null,
        actorRole: session.user.role,
        action: entry.action.slice(0, 64),
        targetType: entry.targetType?.slice(0, 32),
        targetId: entry.targetId ?? null,
        summary: entry.summary?.slice(0, 500),
        ip: request ? clientIp(request.headers).slice(0, 64) : null,
      },
    });
  } catch (error) {
    console.error("[AUDIT]", entry.action, error);
  }
}

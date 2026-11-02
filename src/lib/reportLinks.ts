import crypto from "crypto";
import { prisma } from "./prisma";

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alikes (0/O, 1/l/I)
const VALID_DAYS = 90;

/** Public base URL for links sent outside the app. */
export function appBaseUrl(request?: Request) {
  return (process.env.NEXTAUTH_URL || (request ? new URL(request.url).origin : "http://localhost:3000")).replace(/\/$/, "");
}

/**
 * Short, SMS-friendly report link (/r/Ab3dE7fG) for one attempt. Reuses an unexpired link
 * so a parent who gets several messages about the same result sees the same URL.
 */
export async function reportLinkFor(attempt: { id: string; userId: string; organizationId?: string | null }, baseUrl: string) {
  const existing = await prisma.reportLink.findFirst({ where: { attemptId: attempt.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (existing) return `${baseUrl}/r/${existing.code}`;

  for (let i = 0; i < 5; i++) {
    const bytes = crypto.randomBytes(8);
    const code = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
    try {
      await prisma.reportLink.create({
        data: {
          code,
          attemptId: attempt.id,
          studentId: attempt.userId,
          organizationId: attempt.organizationId ?? null,
          expiresAt: new Date(Date.now() + VALID_DAYS * 24 * 60 * 60 * 1000),
        },
      });
      return `${baseUrl}/r/${code}`;
    } catch {
      // code collision: try another
    }
  }
  throw new Error("Couldn't create a report link");
}

import { prisma } from "./prisma";

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets (0 when allowed). */
  retryAfter: number;
}

/**
 * Fixed-window counter stored in Postgres, so the limit holds across every serverless instance.
 * One atomic upsert per call: the window restarts once `resetAt` has passed.
 *
 * Fails open: if the counter can't be read the request is allowed, because locking every
 * student out of an exam is worse than briefly losing throttling.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  try {
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, NOW() + make_interval(secs => ${windowSeconds}))
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
      RETURNING "count", "resetAt"`;

    // Occasionally sweep expired windows so the table stays small
    if (Math.random() < 0.01) {
      prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } }).catch(() => {});
    }

    const row = rows[0];
    if (!row || row.count <= limit) return { ok: true, retryAfter: 0 };
    return { ok: false, retryAfter: Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000)) };
  } catch (error) {
    console.error("[RATE_LIMIT]", key, error);
    return { ok: true, retryAfter: 0 };
  }
}

/** Read-only: is `key` already over `limit` in its current window? (Fails open.) */
export async function isRateLimited(key: string, limit: number): Promise<boolean> {
  try {
    const row = await prisma.rateLimit.findUnique({ where: { key } });
    return !!row && row.resetAt > new Date() && row.count >= limit;
  } catch (error) {
    console.error("[RATE_LIMIT]", key, error);
    return false;
  }
}

type HeaderSource = Headers | Record<string, string | string[] | undefined> | undefined;

/** Best-effort client IP from the proxy headers Vercel sets. */
export function clientIp(headers: HeaderSource): string {
  const get = (name: string): string | undefined => {
    if (!headers) return undefined;
    if (headers instanceof Headers) return headers.get(name) ?? undefined;
    const v = headers[name];
    return Array.isArray(v) ? v[0] : v;
  };
  const forwarded = get("x-forwarded-for")?.split(",")[0]?.trim();
  return get("x-real-ip") || forwarded || "unknown";
}

export function tooManyRequests(retryAfter: number, message = "Too many attempts. Please wait a few minutes and try again.") {
  return Response.json({ error: message }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
}

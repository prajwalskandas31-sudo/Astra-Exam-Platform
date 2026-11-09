import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Liveness + database check for uptime monitors (e.g. Better Stack, UptimeRobot, Checkly).
 * 200 when the app can reach Postgres, 503 otherwise. Reveals nothing sensitive.
 */
export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", db: "ok", latencyMs: Date.now() - started },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[HEALTH]", error);
    return NextResponse.json({ status: "degraded", db: "unreachable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeJoinCode } from "@/lib/institutes";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

/** Public: GET ?code=XXXX → the institute's name and logo, so the sign-up page can say who you're joining. */
export async function GET(request: Request) {
  const limited = await rateLimit(`join-code:ip:${clientIp(request.headers)}`, 60, 60 * 60);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  const code = normalizeJoinCode(new URL(request.url).searchParams.get("code"));
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
  const org = await prisma.organization.findUnique({ where: { joinCode: code }, select: { name: true, logoUrl: true } });
  if (!org) return NextResponse.json({ error: "That institute code isn't valid." }, { status: 404 });
  return NextResponse.json({ code, name: org.name, logoUrl: org.logoUrl });
}

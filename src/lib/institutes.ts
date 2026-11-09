import crypto from "crypto";
import { prisma } from "./prisma";

// No look-alikes (0/O, 1/I/L) so a code read out in class or typed from WhatsApp is unambiguous
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateJoinCode = () => Array.from(crypto.randomBytes(8), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");

export const normalizeJoinCode = (raw: unknown) =>
  typeof raw === "string" ? raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16) : "";

/** Tenants that exist for demos and testing; a code-less sign-up must never land in them. */
const NON_REAL_SLUGS = ["astra-demo", "astra-loadtest", "test-org"];

/**
 * Which institute a self-service sign-up joins.
 * - With a join code: that institute, or an error if the code is wrong.
 * - Without one: only when the deployment has exactly one real institute (single-institute
 *   installs keep working); otherwise the student must use their institute's link or code,
 *   so nobody silently lands in the wrong institute.
 */
export async function resolveSignupOrganization(rawCode: unknown): Promise<{ id: string } | { error: string }> {
  const code = normalizeJoinCode(rawCode);
  if (code) {
    const org = await prisma.organization.findUnique({ where: { joinCode: code }, select: { id: true } });
    return org ?? { error: "That institute code isn't valid. Check the link or code your institute shared." };
  }
  const real = await prisma.organization.findMany({ where: { slug: { notIn: NON_REAL_SLUGS } }, select: { id: true }, take: 2 });
  if (real.length === 1) return real[0];
  return { error: "Enter your institute's join code (it's in the sign-up link your institute shared)." };
}

/** Get an institute's join code, creating one on first use. */
export async function ensureJoinCode(organizationId: string): Promise<string> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { joinCode: true } });
  if (org?.joinCode) return org.joinCode;
  return rotateJoinCode(organizationId);
}

/** Replace the join code (old links stop working). Retries on the rare collision. */
export async function rotateJoinCode(organizationId: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateJoinCode();
    try {
      await prisma.organization.update({ where: { id: organizationId }, data: { joinCode: code } });
      return code;
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  throw new Error("Could not generate a unique join code");
}

/** URL-safe, unique slug from an institute name: "Apex Coaching" → "apex-coaching", "apex-coaching-2", … */
export async function uniqueSlug(name: string): Promise<string> {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "institute";
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await prisma.organization.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

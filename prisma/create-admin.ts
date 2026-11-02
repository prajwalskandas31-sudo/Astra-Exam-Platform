// Create an institute and its first admin in an empty database (e.g. production).
//
//   npx tsx prisma/create-admin.ts --institute "Apex Coaching" --name "Asha Rao" --email asha@apex.in [--phone "+91 98450 00000"] [--super]
//
// Prints a one-time password; the admin should change it under Settings after signing in.
// Uses DATABASE_URL from the environment, so point it at the database you mean to change.

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

async function main() {
  const institute = arg("institute")?.trim();
  const name = arg("name")?.trim();
  const email = arg("email")?.trim().toLowerCase();
  const phone = arg("phone")?.trim() || null;
  const superAdmin = process.argv.includes("--super");
  if (!institute || !name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Usage: --institute "Name" --name "Full Name" --email you@example.com [--phone "+91…"] [--super]');
  }

  const prisma = new PrismaClient();
  try {
    if (await prisma.user.findUnique({ where: { email } })) throw new Error(`An account with ${email} already exists`);

    const slug = institute.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "institute";
    const org = await prisma.organization.upsert({
      where: { slug },
      update: {},
      create: { name: institute, slug },
    });

    const password = crypto.randomBytes(12).toString("base64url");
    await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: await bcrypt.hash(password, 10),
        role: superAdmin ? "SUPER_ADMIN" : "INSTITUTE_ADMIN",
        status: "APPROVED",
        organizationId: org.id,
      },
    });

    console.log(`\nInstitute: ${org.name} (${org.slug})`);
    console.log(`Admin:     ${email} (${superAdmin ? "super admin" : "institute admin"})`);
    console.log(`Password:  ${password}`);
    console.log("\nShown once — sign in and change it under Settings.\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

// Isolated tenant for load testing: N students and one 180-question paper.
//
//   LOADTEST_PASSWORD=<pw> npx tsx prisma/seed-loadtest.ts --students 1000 --confirm
//   LOADTEST_PASSWORD=<pw> npx tsx prisma/seed-loadtest.ts --remove --confirm
//
// Everything lives in the "astra-loadtest" organization on the reserved .test domain with no phone
// numbers, so no WhatsApp/SMS is ever sent. Re-running replaces it. Run it against a dev/staging
// database, never production: the script prints the target host and refuses without --confirm.

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SLUG = "astra-loadtest";
const DOMAIN = "astra-load.test";
export const LOADTEST_TEST_ID = "loadtest-paper-1";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

async function main() {
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").host;
    } catch {
      return "(unparseable DATABASE_URL)";
    }
  })();
  console.log(`Target database: ${host}`);
  if (!process.argv.includes("--confirm")) throw new Error("Refusing to run without --confirm. Never point this at production.");

  await prisma.organization.deleteMany({ where: { slug: SLUG } });
  if (process.argv.includes("--remove")) {
    console.log("Load-test tenant removed.");
    return;
  }

  const password = process.env.LOADTEST_PASSWORD;
  if (!password || password.length < 8) throw new Error("Set LOADTEST_PASSWORD (8+ characters).");
  const students = Math.max(1, Math.min(20000, Number(arg("students")) || 1000));
  const questionCount = Math.max(1, Math.min(500, Number(arg("questions")) || 180));

  const org = await prisma.organization.create({ data: { name: "Load Test Academy", slug: SLUG, contactEmail: `ops@${DOMAIN}` } });
  const hash = await bcrypt.hash(password, 10);

  for (let i = 0; i < students; i += 1000) {
    await prisma.user.createMany({
      data: Array.from({ length: Math.min(1000, students - i) }, (_, j) => ({
        email: `load${i + j + 1}@${DOMAIN}`,
        name: `Load Student ${i + j + 1}`,
        password: hash,
        role: "STUDENT" as const,
        status: "APPROVED" as const,
        organizationId: org.id,
        notifyWhatsapp: false,
        notifySms: false,
      })),
    });
  }

  const letters = ["A", "B", "C", "D", "E"];
  await prisma.question.createMany({
    data: Array.from({ length: questionCount }, (_, i) => ({
      id: `loadtest-q-${i + 1}`,
      text: `Load test question ${i + 1}: which option is correct?`,
      options: JSON.stringify(letters.map((id) => ({ id, text: `Option ${id}` }))),
      correctOption: letters[i % letters.length],
      subject: ["Medicine", "Surgery", "Paediatrics", "Psychiatry"][i % 4],
      topic: `Topic ${(i % 12) + 1}`,
      tags: "loadtest",
      negativeMarks: 0,
      organizationId: org.id,
    })),
  });

  await prisma.test.create({
    data: {
      id: LOADTEST_TEST_ID,
      title: "Load Test Paper",
      duration: 180,
      totalMarks: questionCount,
      type: "MOCK",
      status: "ACTIVE",
      isPublished: true,
      organizationId: org.id,
      questions: { create: Array.from({ length: questionCount }, (_, i) => ({ questionId: `loadtest-q-${i + 1}`, order: i + 1 })) },
    },
  });

  console.log(`Created ${students} students (load1@${DOMAIN} … load${students}@${DOMAIN}) and test "${LOADTEST_TEST_ID}" with ${questionCount} questions.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

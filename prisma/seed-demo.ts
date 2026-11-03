// A self-contained demo institute for showing the platform to prospective institutes.
//
//   npx tsx prisma/seed-demo.ts
//
// Safe for production: everything lives in its own tenant ("astra-demo"), logins use the reserved
// .test domain, nobody has a phone number (so no WhatsApp/SMS can reach a real person), there is no
// super admin, and every password is random. Re-running refreshes the data and issues new passwords.

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { seedContent } from "./seed-content";
import { gradeAttempt } from "../src/lib/scoring";

const prisma = new PrismaClient();
const DOMAIN = "astra-demo.test";
const DAY = 24 * 60 * 60 * 1000;

const ACCOUNTS = [
  { key: "admin", email: `admin@${DOMAIN}`, name: "Kavya Menon (Demo Director)", role: "INSTITUTE_ADMIN" },
  { key: "faculty", email: `faculty@${DOMAIN}`, name: "Dr. Arvind Rao (Faculty)", role: "FACULTY" },
  { key: "mentor", email: `mentor@${DOMAIN}`, name: "Dr. Sana Qureshi (Mentor)", role: "MENTOR" },
  { key: "student", email: `student@${DOMAIN}`, name: "Aditi Verma", role: "STUDENT" },
  { key: "student2", email: `student2@${DOMAIN}`, name: "Rohan Iyer", role: "STUDENT" },
  { key: "parent", email: `parent@${DOMAIN}`, name: "Sunil Verma (Parent)", role: "PARENT" },
] as const;

// Extra classmates so leaderboards and item analysis have a real spread of results
const CLASSMATES: { name: string; answers: Record<string, string> }[] = [
  { name: "Meghna Pillai", answers: { "seed-q-plab-1": "B", "seed-q-plab-2": "B", "seed-q-plab-3": "B", "seed-q-plab-4": "C", "seed-q-plab-5": "B", "seed-q-plab-6": "B", "seed-q-plab-7": "C", "seed-q-plab-8": "B", "seed-q-plab-9": "A", "seed-q-plab-10": "B", "seed-q-plab-11": "C" } },
  { name: "Farhan Sheikh", answers: { "seed-q-plab-1": "B", "seed-q-plab-2": "A", "seed-q-plab-3": "B", "seed-q-plab-4": "C", "seed-q-plab-5": "A", "seed-q-plab-6": "B", "seed-q-plab-8": "B", "seed-q-plab-10": "B", "seed-q-plab-12": "B" } },
  { name: "Divya Nair", answers: { "seed-q-plab-1": "A", "seed-q-plab-2": "B", "seed-q-plab-3": "C", "seed-q-plab-4": "C", "seed-q-plab-5": "B", "seed-q-plab-6": "A", "seed-q-plab-7": "C", "seed-q-plab-9": "B", "seed-q-plab-11": "C" } },
  { name: "Karan Malhotra", answers: { "seed-q-plab-1": "C", "seed-q-plab-2": "A", "seed-q-plab-3": "A", "seed-q-plab-4": "A", "seed-q-plab-6": "B", "seed-q-plab-8": "A", "seed-q-plab-10": "A" } },
  { name: "Nisha Reddy", answers: { "seed-q-plab-1": "B", "seed-q-plab-2": "B", "seed-q-plab-3": "B", "seed-q-plab-4": "C", "seed-q-plab-5": "B", "seed-q-plab-6": "B", "seed-q-plab-7": "C", "seed-q-plab-8": "B", "seed-q-plab-9": "A", "seed-q-plab-10": "B", "seed-q-plab-11": "C", "seed-q-plab-12": "B" } },
];

const password = () => crypto.randomBytes(9).toString("base64url");

async function main() {
  // The shared content seeder uses fixed ids; never pull another institute's copies into the demo
  const existing = await prisma.test.findUnique({ where: { id: "seed-test-plab-1" }, select: { organization: { select: { slug: true } } } });
  if (existing && existing.organization?.slug !== "astra-demo") {
    throw new Error(`This database already has the sample content under "${existing.organization?.slug}". Use it as-is (npm run db:setup data) instead of the demo seed.`);
  }

  const org = await prisma.organization.upsert({
    where: { slug: "astra-demo" },
    update: {},
    create: {
      name: "Astra Demo Academy",
      slug: "astra-demo",
      primaryColor: "#2563eb",
      secondaryColor: "#1d4ed8",
      contactEmail: `hello@${DOMAIN}`,
      academicYear: "2026-2027",
      offeredCategories: JSON.stringify(["PLAB", "NEET", "JEE", "GATE"]),
    },
  });
  const batch = await prisma.batch.upsert({
    where: { name_organizationId: { name: "PLAB 2027 Demo Batch", organizationId: org.id } },
    update: {},
    create: { name: "PLAB 2027 Demo Batch", organizationId: org.id },
  });

  const credentials: { role: string; email: string; password: string }[] = [];
  const ids: Record<string, string> = {};
  const upsertUser = async (email: string, name: string, role: string, withBatch: boolean) => {
    const pw = password();
    const hash = await bcrypt.hash(pw, 10);
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, password: hash, status: "APPROVED", phone: null, sessionId: crypto.randomUUID() },
      create: {
        email, name, password: hash, role: role as never, status: "APPROVED", phone: null,
        organizationId: org.id, batchId: withBatch ? batch.id : null,
      },
    });
    if (user.organizationId !== org.id) throw new Error(`${email} belongs to another institute; refusing to touch it`);
    credentials.push({ role, email, password: pw });
    return user.id;
  };

  for (const a of ACCOUNTS) ids[a.key] = await upsertUser(a.email, a.name, a.role, a.role === "STUDENT");
  for (const sid of [ids.student, ids.student2]) {
    await prisma.parentStudentLink.upsert({
      where: { parentId_studentId: { parentId: ids.parent, studentId: sid } },
      create: { parentId: ids.parent, studentId: sid },
      update: {},
    });
  }

  // Templates, question bank, tests, graded attempts, study history, review queue, a question report
  await seedContent(prisma, { orgId: org.id, batchId: batch.id, studentId: ids.student, student2Id: ids.student2, mentorId: ids.mentor });

  // Classmates on the PLAB mock (their logins aren't handed out, but their passwords are still random)
  const testId = "seed-test-plab-1";
  const tq = await prisma.testQuestion.findMany({ where: { testId }, include: { question: true }, orderBy: { order: "asc" } });
  const test = await prisma.test.findUniqueOrThrow({ where: { id: testId } });
  for (const [i, c] of CLASSMATES.entries()) {
    const email = `classmate${i + 1}@${DOMAIN}`;
    const hash = await bcrypt.hash(password(), 10);
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: c.name },
      create: { email, name: c.name, password: hash, role: "STUDENT", status: "APPROVED", organizationId: org.id, batchId: batch.id },
    });
    if (await prisma.attempt.findFirst({ where: { userId: user.id, testId } })) continue;

    const answers = tq.map((t) => ({ questionId: t.questionId, selectedOpt: c.answers[t.questionId] ?? null, timeSpent: 35 + ((i * 13 + t.order * 7) % 70) }));
    const result = gradeAttempt(tq.map((t) => t.question), answers);
    const start = new Date(Date.now() - (6 - i) * DAY);
    await prisma.attempt.create({
      data: {
        userId: user.id, testId, mode: "CBT", status: "COMPLETED", timeRemaining: 0,
        startTime: start, endTime: new Date(start.getTime() + test.duration * 50000),
        score: result.score, percentage: result.percentage, accuracy: result.accuracy,
        attemptedCount: result.attemptedCount, correctCount: result.correctCount,
        incorrectCount: result.incorrectCount, unattemptedCount: result.unattemptedCount,
        subjectScores: JSON.stringify(result.subjectScores), chapterScores: JSON.stringify(result.chapterScores),
        topicScores: JSON.stringify(result.topicScores), weakTopics: JSON.stringify(result.weakTopics), strongTopics: JSON.stringify(result.strongTopics),
        answers: {
          create: answers.map((a) => ({
            questionId: a.questionId, selectedOpt: a.selectedOpt, timeSpent: a.timeSpent,
            status: a.selectedOpt ? "ANSWERED" : "UNANSWERED",
            isCorrect: result.perQuestion[a.questionId]?.isCorrect ?? null,
            subject: result.perQuestion[a.questionId]?.subject, chapter: result.perQuestion[a.questionId]?.chapter, topic: result.perQuestion[a.questionId]?.topic,
          })),
        },
      },
    });
  }

  // Re-rank everyone on the mock now that the classmates have taken it
  const done = await prisma.attempt.findMany({
    where: { testId, isRetry: false, status: { in: ["COMPLETED", "AUTO_SUBMITTED"] } },
    orderBy: { score: "desc" },
    select: { id: true, score: true },
  });
  for (const a of done) {
    const higher = done.filter((x) => (x.score ?? 0) > (a.score ?? 0)).length;
    const percentile = done.length > 1 ? Math.round(((done.length - 1 - higher) / (done.length - 1)) * 1000) / 10 : 100;
    await prisma.attempt.update({ where: { id: a.id }, data: { rank: higher + 1, percentile } });
  }

  console.log(`\nDemo institute ready: ${org.name}  (${done.length} students on "${test.title}")\n`);
  for (const c of credentials) console.log(`${c.role.padEnd(16)} ${c.email.padEnd(28)} ${c.password}`);
  console.log("\nPasswords are new on every run and aren't stored anywhere in plain text.\n");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

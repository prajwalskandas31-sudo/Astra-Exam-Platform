import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function runSimulations() {
  console.log("\n🚀 Starting Astra Exam Platform Simluation (Tenant & Questions)");
  try {
    // 1. Organization Categories Simulation
    console.log("\n1. Testing Organization Categories");
    let org = await prisma.organization.findFirst({
      where: { name: "Test Apex Academy" }
    });

    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: "Test Apex Academy",
          slug: "test-apex-academy",
          offeredCategories: "JEE,NEET"
        }
      });
    } else {
      org = await prisma.organization.update({
        where: { id: org.id },
        data: { offeredCategories: "GATE,AFCAT" }
      });
    }

    assert("Organization 'offeredCategories' stored correctly", org.offeredCategories === "GATE,AFCAT" || org.offeredCategories === "JEE,NEET");
    console.log(`     -> Organization Categories: ${org.offeredCategories}`);

    // 2. Question Draft -> Published Simulation
    console.log("\n2. Testing Question Status Transition (Draft -> Published)");
    const question = await prisma.question.create({
      data: {
        text: "What is the speed of light?",
        correctOption: "C",
        options: JSON.stringify(["100", "200", "300000 km/s", "400"]),
        subject: "PHYSICS",
        topic: "Speed",
        tags: "physics",
        difficulty: "EASY",
        marks: 4,
        status: "DRAFT" // New field
      }
    });

    assert("Question created with DRAFT status", question.status === "DRAFT");

    const updatedQuestion = await prisma.question.update({
      where: { id: question.id },
      data: { status: "PUBLISHED", correctOption: "C" }
    });

    assert("Question status updated to PUBLISHED", updatedQuestion.status === "PUBLISHED");

    // Clean up
    await prisma.question.delete({ where: { id: question.id } });
    await prisma.organization.delete({ where: { id: org.id } });
    
    console.log(`\n🎉 Simulation Complete: ${passed} Passed, ${failed} Failed`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("Simulation failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSimulations();

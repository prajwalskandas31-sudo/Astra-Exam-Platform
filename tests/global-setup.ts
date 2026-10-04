import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function globalSetup() {
  console.log('Seeding test database...');
  
  // Try to find if test users exist, if not create them
  const passwordHash = await bcrypt.hash('Password123!', 10);
  
  // Create or update organization
  const org = await prisma.organization.upsert({
    where: { slug: 'test-org' },
    update: {},
    create: {
      name: 'Test Organization',
      slug: 'test-org',
    }
  });

  // Seed Admin
  await prisma.user.upsert({
    where: { email: 'admin@astra.local' },
    update: { password: passwordHash, status: 'APPROVED', role: 'SUPER_ADMIN', organizationId: org.id },
    create: {
      email: 'admin@astra.local',
      password: passwordHash,
      name: 'Test Admin',
      role: 'SUPER_ADMIN',
      status: 'APPROVED',
      organizationId: org.id
    }
  });

  // Seed Faculty
  await prisma.user.upsert({
    where: { email: 'faculty@astra.local' },
    update: { password: passwordHash, status: 'APPROVED', role: 'FACULTY', organizationId: org.id },
    create: {
      email: 'faculty@astra.local',
      password: passwordHash,
      name: 'Test Faculty',
      role: 'FACULTY',
      status: 'APPROVED',
      organizationId: org.id
    }
  });

  console.log('Seeding complete.');
}

export default globalSetup;

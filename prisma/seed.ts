import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { seedContent } from './seed-content'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Multi-Tenant Competitive Exam Platform Data...')

  const password = await bcrypt.hash('password123', 10)

  // 1. Create Organization (Tenant)
  const org = await prisma.organization.upsert({
    where: { slug: 'apex-academy' },
    update: {},
    create: {
      name: 'Apex Competitive Coaching Institute',
      slug: 'apex-academy',
      logoUrl: '/logo.png',
      primaryColor: '#2563eb',
      secondaryColor: '#1d4ed8',
      contactEmail: 'contact@apexacademy.com',
      contactPhone: '+919876543210',
      academicYear: '2026-2027',
      whatsappConfig: JSON.stringify({ provider: 'MOCK_WHATSAPP_API', apiKey: 'test-key' })
    }
  })

  // 2. Create Batch
  const batch = await prisma.batch.upsert({
    where: { name_organizationId: { name: 'JEE 2026 Achievers Batch', organizationId: org.id } },
    update: {},
    create: {
      name: 'JEE 2026 Achievers Batch',
      organizationId: org.id
    }
  })

  // 3. Create Users with 5 Roles
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@platform.com' },
    update: { role: 'SUPER_ADMIN', status: 'APPROVED' },
    create: {
      email: 'superadmin@platform.com',
      name: 'Global Platform Admin',
      password,
      role: 'SUPER_ADMIN',
      status: 'APPROVED'
    }
  })

  const instAdmin = await prisma.user.upsert({
    where: { email: 'admin@apex.com' },
    update: { role: 'INSTITUTE_ADMIN', status: 'APPROVED' },
    create: {
      email: 'admin@apex.com',
      name: 'Apex Institute Director',
      password,
      role: 'INSTITUTE_ADMIN',
      status: 'APPROVED',
      organizationId: org.id
    }
  })

  const adminPlab = await prisma.user.upsert({
    where: { email: 'admin@astra.com' },
    update: { role: 'INSTITUTE_ADMIN', status: 'APPROVED' },
    create: {
      email: 'admin@astra.com',
      name: 'Astra Exam Platform Admin',
      password,
      role: 'INSTITUTE_ADMIN',
      status: 'APPROVED',
      organizationId: org.id
    }
  })

  const faculty = await prisma.user.upsert({
    where: { email: 'faculty@apex.com' },
    update: { role: 'FACULTY', status: 'APPROVED' },
    create: {
      email: 'faculty@apex.com',
      name: 'Prof. Sharma (Physics Dept)',
      password,
      role: 'FACULTY',
      status: 'APPROVED',
      organizationId: org.id
    }
  })

  const mentorPlab = await prisma.user.upsert({
    where: { email: 'mentor@astra.com' },
    update: { role: 'MENTOR', status: 'APPROVED' },
    create: {
      email: 'mentor@astra.com',
      name: 'Dr. Sarah Jenkins (Astra Mentor)',
      password,
      role: 'MENTOR',
      status: 'APPROVED',
      organizationId: org.id
    }
  })

  const student = await prisma.user.upsert({
    where: { email: 'student@apex.com' },
    update: { role: 'STUDENT', status: 'APPROVED' },
    create: {
      email: 'student@apex.com',
      name: 'Rahul Sharma',
      phone: '+919876543211',
      password,
      role: 'STUDENT',
      status: 'APPROVED',
      organizationId: org.id,
      batchId: batch.id
    }
  })

  const studentPlab = await prisma.user.upsert({
    where: { email: 'student@astra.com' },
    update: { role: 'STUDENT', status: 'APPROVED' },
    create: {
      email: 'student@astra.com',
      name: 'Dr. Alex Vance',
      phone: '+919876543299',
      password,
      role: 'STUDENT',
      status: 'APPROVED',
      organizationId: org.id,
      batchId: batch.id
    }
  })

  const parent = await prisma.user.upsert({
    where: { email: 'parent@apex.com' },
    update: {},
    create: {
      email: 'parent@apex.com',
      name: 'Mrs. Sunita Sharma',
      phone: '+919876543212',
      password,
      role: 'PARENT',
      status: 'APPROVED',
      organizationId: org.id
    }
  })

  const parentPlab = await prisma.user.upsert({
    where: { email: 'parent@astra.com' },
    update: {},
    create: {
      email: 'parent@astra.com',
      name: 'Mr. David Vance (Parent)',
      phone: '+919876543290',
      password,
      role: 'PARENT',
      status: 'APPROVED',
      organizationId: org.id
    }
  })

  // 4. Link Parent to Student
  await prisma.parentStudentLink.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
    update: {},
    create: {
      parentId: parent.id,
      studentId: student.id
    }
  })

  await prisma.parentStudentLink.upsert({
    where: { parentId_studentId: { parentId: parentPlab.id, studentId: studentPlab.id } },
    update: {},
    create: {
      parentId: parentPlab.id,
      studentId: studentPlab.id
    }
  })

  // 5. Templates, question bank, tests, demo attempts, announcements, resources
  await seedContent(prisma, {
    orgId: org.id,
    batchId: batch.id,
    studentId: studentPlab.id,
    student2Id: student.id,
    mentorId: mentorPlab.id
  })

  console.log('✅ Multi-Tenant Seeding Completed Successfully!')
  console.log('----------------------------------------------------')
  console.log('Organization:  Apex Competitive Coaching Institute (slug: apex-academy)')
  console.log('Super Admin:   superadmin@platform.com / password123')
  console.log('Inst Admin:    admin@apex.com / password123')
  console.log('Faculty:       faculty@apex.com / password123')
  console.log('Student:       student@astra.com / password123 (Linked Parent: parent@astra.com)')
  console.log('Mentor:        mentor@astra.com / password123')
  console.log('Parent:        parent@apex.com / password123')
  console.log('Content:       4 templates, 27 questions, 4 tests (PLAB, JEE, NEET OMR), demo attempts')
  console.log('----------------------------------------------------')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

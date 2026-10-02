import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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

  // 5. Create Exam Templates for major competitive exams
  const jeeTemplate = await prisma.examTemplate.create({
    data: {
      name: 'JEE Main CBT Official Pattern 2026',
      examCategory: 'JEE',
      mode: 'CBT',
      totalDuration: 180, // 3 hours
      isSectionalTiming: false,
      hasNegativeMarking: true,
      config: JSON.stringify({
        sections: [
          { name: 'Physics', questionCount: 25, marksPerQuestion: 4, negativeMarking: 1 },
          { name: 'Chemistry', questionCount: 25, marksPerQuestion: 4, negativeMarking: 1 },
          { name: 'Mathematics', questionCount: 25, marksPerQuestion: 4, negativeMarking: 1 }
        ],
        allowQuestionNavigation: true,
        randomizeQuestions: true,
        randomizeOptions: true,
        proctoring: { enableTabSwitchDetection: true, maxViolations: 3 }
      }),
      organizationId: org.id
    }
  })

  const neetTemplate = await prisma.examTemplate.create({
    data: {
      name: 'NEET UG OMR Practice Pattern 2026',
      examCategory: 'NEET',
      mode: 'OMR',
      totalDuration: 200, // 3 hours 20 mins
      isSectionalTiming: false,
      hasNegativeMarking: true,
      config: JSON.stringify({
        sections: [
          { name: 'Physics', questionCount: 45, marksPerQuestion: 4, negativeMarking: 1 },
          { name: 'Chemistry', questionCount: 45, marksPerQuestion: 4, negativeMarking: 1 },
          { name: 'Botany', questionCount: 45, marksPerQuestion: 4, negativeMarking: 1 },
          { name: 'Zoology', questionCount: 45, marksPerQuestion: 4, negativeMarking: 1 }
        ],
        omrSheetGridCols: 4,
        allowReviewBeforeSubmit: true
      }),
      organizationId: org.id
    }
  })

  const gateTemplate = await prisma.examTemplate.create({
    data: {
      name: 'GATE Computer Science CBT Pattern',
      examCategory: 'GATE',
      mode: 'CBT',
      totalDuration: 180,
      isSectionalTiming: false,
      hasNegativeMarking: true,
      config: JSON.stringify({
        sections: [
          { name: 'General Aptitude', questionCount: 10, totalMarks: 15 },
          { name: 'Computer Science Core', questionCount: 55, totalMarks: 85 }
        ],
        virtualCalculatorEnabled: true
      }),
      organizationId: org.id
    }
  })

  const afcatTemplate = await prisma.examTemplate.create({
    data: {
      name: 'AFCAT Standard CBT Pattern',
      examCategory: 'AFCAT',
      mode: 'CBT',
      totalDuration: 120,
      isSectionalTiming: false,
      hasNegativeMarking: true,
      config: JSON.stringify({
        sections: [
          { name: 'General Awareness', questionCount: 25 },
          { name: 'Verbal Ability in English', questionCount: 25 },
          { name: 'Numerical Ability', questionCount: 20 },
          { name: 'Reasoning and Military Aptitude', questionCount: 30 }
        ]
      }),
      organizationId: org.id
    }
  })

  // 6. Create Questions with Multi-Format support
  const q1 = await prisma.question.create({
    data: {
      text: 'A block of mass 5 kg moves on a horizontal frictionless surface under a constant horizontal force of 20 N. Calculate the acceleration of the block.',
      options: JSON.stringify([
        { id: 'A', text: '2 m/s²' },
        { id: 'B', text: '4 m/s²' },
        { id: 'C', text: '5 m/s²' },
        { id: 'D', text: '10 m/s²' }
      ]),
      correctOption: 'B',
      explanation: 'Using Newton\'s Second Law: a = F / m = 20 N / 5 kg = 4 m/s².',
      subject: 'Physics',
      chapter: 'Laws of Motion',
      topic: 'Newton\'s Second Law',
      subtopic: 'Force and Acceleration',
      difficulty: 'EASY',
      questionType: 'SINGLE_CHOICE',
      marks: 4,
      negativeMarks: 1,
      tags: 'jee,physics,mechanics',
      estimatedTime: 60,
      examCategory: 'JEE',
      organizationId: org.id
    }
  })

  const q2 = await prisma.question.create({
    data: {
      text: 'Which of the following compounds undergo SN1 reaction fastest in ethanol?',
      options: JSON.stringify([
        { id: 'A', text: 'Methyl chloride' },
        { id: 'B', text: 'Ethyl chloride' },
        { id: 'C', text: 'Isopropyl chloride' },
        { id: 'D', text: 'tert-Butyl chloride' }
      ]),
      correctOption: 'D',
      explanation: 'SN1 reaction rate depends on the stability of carbocation formed. Tertiary carbocation is most stable due to hyperconjugation and inductive effect.',
      subject: 'Chemistry',
      chapter: 'Organic Chemistry',
      topic: 'Haloalkanes and Haloarenes',
      subtopic: 'Nucleophilic Substitution Reactions',
      difficulty: 'MEDIUM',
      questionType: 'SINGLE_CHOICE',
      marks: 4,
      negativeMarks: 1,
      tags: 'jee,neet,chemistry,organic',
      estimatedTime: 90,
      examCategory: 'JEE',
      organizationId: org.id
    }
  })

  const q3 = await prisma.question.create({
    data: {
      text: 'If matrix A = [[1, 2], [3, 4]], calculate the determinant |A|.',
      options: JSON.stringify([
        { id: 'A', text: '-2' },
        { id: 'B', text: '2' },
        { id: 'C', text: '10' },
        { id: 'D', text: '-10' }
      ]),
      correctOption: 'A',
      explanation: '|A| = (1 * 4) - (2 * 3) = 4 - 6 = -2.',
      subject: 'Mathematics',
      chapter: 'Matrices and Determinants',
      topic: 'Determinants',
      subtopic: '2x2 Determinant Calculation',
      difficulty: 'EASY',
      questionType: 'NUMERICAL',
      marks: 4,
      negativeMarks: 0,
      tags: 'jee,maths,algebra',
      estimatedTime: 45,
      examCategory: 'JEE',
      organizationId: org.id
    }
  })

  // 7. Create a JEE Mock Test (CBT)
  const jeeMockTest = await prisma.test.create({
    data: {
      title: 'JEE Main Full Length Mock Test #1',
      description: 'Comprehensive CBT mock exam following official NTA JEE pattern.',
      duration: 180,
      totalMarks: 300,
      type: 'MOCK',
      mode: 'CBT',
      status: 'ACTIVE',
      isPublished: true,
      templateId: jeeTemplate.id,
      organizationId: org.id,
      batches: { connect: [{ id: batch.id }] },
      questions: {
        create: [
          { question: { connect: { id: q1.id } }, order: 1, section: 'Physics' },
          { question: { connect: { id: q2.id } }, order: 2, section: 'Chemistry' },
          { question: { connect: { id: q3.id } }, order: 3, section: 'Mathematics' }
        ]
      }
    }
  })

  // 8. Create a NEET OMR Practice Test
  const neetOmrTest = await prisma.test.create({
    data: {
      title: 'NEET UG Full Syllabus OMR Practice Test #1',
      description: 'Pen-paper / OMR simulation practice test for NEET aspirants.',
      duration: 200,
      totalMarks: 720,
      type: 'PRACTICE',
      mode: 'OMR',
      status: 'ACTIVE',
      isPublished: true,
      templateId: neetTemplate.id,
      organizationId: org.id,
      batches: { connect: [{ id: batch.id }] },
      questions: {
        create: [
          { question: { connect: { id: q1.id } }, order: 1, section: 'Physics' },
          { question: { connect: { id: q2.id } }, order: 2, section: 'Chemistry' }
        ]
      }
    }
  })

  console.log('✅ Multi-Tenant Seeding Completed Successfully!')
  console.log('----------------------------------------------------')
  console.log('Organization:  Apex Competitive Coaching Institute (slug: apex-academy)')
  console.log('Super Admin:   superadmin@platform.com / password123')
  console.log('Inst Admin:    admin@apex.com / password123')
  console.log('Faculty:       faculty@apex.com / password123')
  console.log('Student:       student@apex.com / password123 (Linked Parent: parent@apex.com)')
  console.log('Parent:        parent@apex.com / password123')
  console.log('Exam Templates: JEE CBT, NEET OMR, GATE CBT, AFCAT CBT')
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

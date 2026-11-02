// Demo content for the seed script: templates, a question bank, tests, graded
// attempts, announcements and resources. Everything uses fixed ids so re-running
// the seed updates rows instead of duplicating them.

import type { PrismaClient } from '@prisma/client'
import { gradeAttempt } from '../src/lib/scoring'

type Opt = [string, string]
interface SeedQuestion {
  id: string
  text: string
  options?: Opt[]
  correct: string
  explanation: string
  subject: string
  chapter: string
  topic: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  type?: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'NUMERICAL'
  marks: number
  negative: number
  category: string
}

const plab = (n: number, text: string, options: string[], correct: string, explanation: string, chapter: string, topic: string, difficulty: SeedQuestion['difficulty'] = 'MEDIUM'): SeedQuestion => ({
  id: `seed-q-plab-${n}`, text, options: options.map((t, i) => [String.fromCharCode(65 + i), t]), correct, explanation,
  subject: 'Clinical Medicine', chapter, topic, difficulty, marks: 1, negative: 0, category: 'PLAB',
})

const QUESTIONS: SeedQuestion[] = [
  plab(1, 'A 24-year-old woman develops wheeze, facial swelling and a blood pressure of 78/40 mmHg minutes after eating a peanut snack. What is the most appropriate immediate treatment?',
    ['IV chlorphenamine 10 mg', 'IM adrenaline 0.5 mg (1:1000)', 'IV hydrocortisone 200 mg', 'Nebulised salbutamol 5 mg', 'Oral cetirizine 10 mg'], 'B',
    'Anaphylaxis is treated first with intramuscular adrenaline 0.5 mg (0.5 mL of 1:1000) into the anterolateral thigh, repeated after 5 minutes if needed. Antihistamines and steroids are not first-line.', 'Emergency Medicine', 'Anaphylaxis', 'EASY'),
  plab(2, 'A GP sees a 7-year-old with fever and a non-blanching purpuric rash. Meningococcal disease is suspected. What should be given before urgent hospital transfer?',
    ['Oral amoxicillin', 'IM or IV benzylpenicillin', 'IV vancomycin', 'Oral ciprofloxacin', 'No antibiotics until a lumbar puncture is done'], 'B',
    'In suspected meningococcal disease in primary care, give IM/IV benzylpenicillin as soon as possible, provided it does not delay transfer.', 'Infectious Disease', 'Meningococcal disease'),
  plab(3, 'A 19-year-old with type 1 diabetes presents with vomiting, ketones 5.2 mmol/L and pH 7.1. What is the most appropriate initial intravenous fluid?',
    ['5% glucose', '0.9% sodium chloride', '10% glucose', 'Hartmann\'s with added potassium only after insulin', '4.5% human albumin'], 'B',
    'Initial fluid resuscitation in DKA is with 0.9% sodium chloride. Glucose is added once blood glucose falls below 14 mmol/L.', 'Endocrinology', 'Diabetic ketoacidosis'),
  plab(4, 'A patient with CKD has a potassium of 7.1 mmol/L and peaked T waves on the ECG. What is the most appropriate first treatment?',
    ['IV insulin with glucose', 'Calcium resonium', 'IV calcium gluconate 10%', 'Nebulised salbutamol', 'Urgent haemodialysis'], 'C',
    'IV calcium gluconate stabilises the cardiac membrane and is given first when hyperkalaemia causes ECG changes. Insulin–glucose then shifts potassium into cells.', 'Nephrology', 'Hyperkalaemia'),
  plab(5, 'A 45-year-old man of White British background has sustained clinic BP of 162/98 mmHg and ambulatory average 154/94 mmHg. He is not diabetic. What is the first-line antihypertensive?',
    ['Amlodipine', 'Ramipril', 'Indapamide', 'Bisoprolol', 'Doxazosin'], 'B',
    'NICE recommends an ACE inhibitor (or ARB) first-line for people under 55 who are not of Black African or African–Caribbean family origin.', 'Cardiology', 'Hypertension'),
  plab(6, 'A 58-year-old has 2 hours of central chest pain and ST elevation in V1–V4. A PCI centre can treat him within 90 minutes. What is the best reperfusion strategy?',
    ['Thrombolysis with alteplase', 'Primary percutaneous coronary intervention', 'Coronary artery bypass grafting', 'IV heparin infusion only', 'Repeat ECG in 30 minutes'], 'B',
    'Primary PCI is the reperfusion strategy of choice for STEMI presenting within 12 hours when it can be delivered within 120 minutes of when fibrinolysis could have been given.', 'Cardiology', 'Acute coronary syndrome'),
  plab(7, 'A woman at 7 weeks\' gestation has lower abdominal pain and spotting. Ultrasound shows an empty uterus. Where is an ectopic pregnancy most commonly located?',
    ['Ovary', 'Cervix', 'Ampulla of the fallopian tube', 'Isthmus of the fallopian tube', 'Abdominal cavity'], 'C',
    'Most ectopic pregnancies (around 80%) implant in the ampulla of the fallopian tube.', 'Obstetrics & Gynaecology', 'Ectopic pregnancy', 'EASY'),
  plab(8, 'A 2-year-old has a barking cough, hoarse voice and mild stridor only when upset. What is the most appropriate treatment?',
    ['Oral amoxicillin', 'Single dose of oral dexamethasone', 'Nebulised salbutamol', 'IV ceftriaxone', 'Admit for intubation'], 'B',
    'Mild croup is treated with a single dose of oral dexamethasone (0.15 mg/kg) and can usually be managed at home with safety-netting.', 'Paediatrics', 'Croup', 'EASY'),
  plab(9, 'A man on lithium for bipolar disorder presents with vomiting, diarrhoea, ataxia and a coarse tremor after starting a new tablet for hypertension. Which drug most likely caused this?',
    ['Amlodipine', 'Bendroflumethiazide', 'Doxazosin', 'Atenolol', 'Hydralazine'], 'B',
    'Thiazide diuretics reduce renal lithium clearance and commonly precipitate lithium toxicity (coarse tremor, GI upset, ataxia, confusion).', 'Psychiatry', 'Lithium toxicity', 'HARD'),
  plab(10, 'A 30-year-old is found with pinpoint pupils, a respiratory rate of 6/min and reduced consciousness. What is the most appropriate antidote?',
    ['Flumazenil', 'Naloxone', 'N-acetylcysteine', 'Atropine', 'Activated charcoal'], 'B',
    'Pinpoint pupils with respiratory depression suggest opioid toxicity; naloxone reverses it.', 'Emergency Medicine', 'Poisoning', 'EASY'),
  plab(11, 'What is the most common causative organism of community-acquired pneumonia in UK adults?',
    ['Haemophilus influenzae', 'Staphylococcus aureus', 'Streptococcus pneumoniae', 'Mycoplasma pneumoniae', 'Legionella pneumophila'], 'C',
    'Streptococcus pneumoniae is the most common cause of community-acquired pneumonia.', 'Respiratory', 'Pneumonia', 'EASY'),
  plab(12, 'A patient took 40 paracetamol tablets 6 hours ago; the paracetamol level is above the treatment line. What is the treatment?',
    ['Activated charcoal only', 'IV N-acetylcysteine', 'Oral methionine only', 'Haemodialysis', 'IV naloxone'], 'B',
    'IV acetylcysteine is the treatment for paracetamol overdose above the treatment line (or of uncertain timing / staggered overdose).', 'Emergency Medicine', 'Poisoning'),

  // JEE — Physics
  { id: 'seed-q-phy-1', text: 'A block of mass 5 kg on a frictionless surface is pushed by a constant horizontal force of 20 N. What is its acceleration?', options: [['A', '2 m/s²'], ['B', '4 m/s²'], ['C', '5 m/s²'], ['D', '10 m/s²']], correct: 'B', explanation: 'Newton\'s second law: a = F/m = 20/5 = 4 m/s².', subject: 'Physics', chapter: 'Laws of Motion', topic: 'Newton\'s Second Law', difficulty: 'EASY', marks: 4, negative: 1, category: 'JEE' },
  { id: 'seed-q-phy-2', text: 'A ball is thrown vertically upward at 20 m/s. Taking g = 10 m/s², what is the maximum height reached (in metres)?', correct: '20', explanation: 'h = u²/2g = 400/20 = 20 m.', subject: 'Physics', chapter: 'Kinematics', topic: 'Motion under gravity', difficulty: 'EASY', type: 'NUMERICAL', marks: 4, negative: 0, category: 'JEE' },
  { id: 'seed-q-phy-3', text: 'Which of the following are vector quantities? (Select all that apply)', options: [['A', 'Displacement'], ['B', 'Speed'], ['C', 'Force'], ['D', 'Mass']], correct: 'A,C', explanation: 'Displacement and force have both magnitude and direction; speed and mass are scalars.', subject: 'Physics', chapter: 'Units and Measurements', topic: 'Scalars and vectors', difficulty: 'MEDIUM', type: 'MULTIPLE_CHOICE', marks: 4, negative: 2, category: 'JEE' },
  { id: 'seed-q-phy-4', text: 'The SI unit of electric field is:', options: [['A', 'N·C'], ['B', 'N/C'], ['C', 'C/N'], ['D', 'J/C']], correct: 'B', explanation: 'E = F/q, so the unit is newton per coulomb (equivalently V/m).', subject: 'Physics', chapter: 'Electrostatics', topic: 'Electric field', difficulty: 'EASY', marks: 4, negative: 1, category: 'JEE' },
  // JEE — Chemistry
  { id: 'seed-q-chem-1', text: 'Which compound undergoes an SN1 reaction fastest in ethanol?', options: [['A', 'Methyl chloride'], ['B', 'Ethyl chloride'], ['C', 'Isopropyl chloride'], ['D', 'tert-Butyl chloride']], correct: 'D', explanation: 'SN1 rate depends on carbocation stability; the tertiary carbocation is the most stable.', subject: 'Chemistry', chapter: 'Organic Chemistry', topic: 'Haloalkanes', difficulty: 'MEDIUM', marks: 4, negative: 1, category: 'JEE' },
  { id: 'seed-q-chem-2', text: 'What is the pH of a 0.001 M HCl solution at 25 °C?', correct: '3', explanation: 'HCl is a strong acid, so [H⁺] = 10⁻³ M and pH = 3.', subject: 'Chemistry', chapter: 'Equilibrium', topic: 'pH', difficulty: 'EASY', type: 'NUMERICAL', marks: 4, negative: 0, category: 'JEE' },
  { id: 'seed-q-chem-3', text: 'The hybridisation of each carbon atom in ethyne (C₂H₂) is:', options: [['A', 'sp'], ['B', 'sp²'], ['C', 'sp³'], ['D', 'sp³d']], correct: 'A', explanation: 'Each carbon forms a triple bond and one single bond — two σ bonds — so it is sp hybridised (linear).', subject: 'Chemistry', chapter: 'Chemical Bonding', topic: 'Hybridisation', difficulty: 'EASY', marks: 4, negative: 1, category: 'JEE' },
  { id: 'seed-q-chem-4', text: 'Which of these elements are noble gases? (Select all that apply)', options: [['A', 'Argon'], ['B', 'Nitrogen'], ['C', 'Neon'], ['D', 'Chlorine']], correct: 'A,C', explanation: 'Argon and neon are group 18 elements.', subject: 'Chemistry', chapter: 'Periodic Table', topic: 'Group 18', difficulty: 'EASY', type: 'MULTIPLE_CHOICE', marks: 4, negative: 2, category: 'JEE' },
  // JEE — Mathematics
  { id: 'seed-q-math-1', text: 'If A = [[1, 2], [3, 4]], what is det(A)?', correct: '-2', explanation: '|A| = (1)(4) − (2)(3) = −2.', subject: 'Mathematics', chapter: 'Matrices and Determinants', topic: 'Determinants', difficulty: 'EASY', type: 'NUMERICAL', marks: 4, negative: 0, category: 'JEE' },
  { id: 'seed-q-math-2', text: 'd/dx (sin x) equals:', options: [['A', '−cos x'], ['B', 'cos x'], ['C', 'sec² x'], ['D', '−sin x']], correct: 'B', explanation: 'The derivative of sin x is cos x.', subject: 'Mathematics', chapter: 'Calculus', topic: 'Differentiation', difficulty: 'EASY', marks: 4, negative: 1, category: 'JEE' },
  { id: 'seed-q-math-3', text: 'Evaluate ∫₀¹ 2x dx.', correct: '1', explanation: '∫ 2x dx = x²; from 0 to 1 this is 1.', subject: 'Mathematics', chapter: 'Calculus', topic: 'Definite integrals', difficulty: 'EASY', type: 'NUMERICAL', marks: 4, negative: 0, category: 'JEE' },
  { id: 'seed-q-math-4', text: 'In how many ways can the letters of the word "LEVEL" be arranged?', options: [['A', '120'], ['B', '60'], ['C', '30'], ['D', '20']], correct: 'C', explanation: '5!/(2!·2!) = 120/4 = 30, since L and E each repeat twice.', subject: 'Mathematics', chapter: 'Permutations and Combinations', topic: 'Arrangements with repetition', difficulty: 'MEDIUM', marks: 4, negative: 1, category: 'JEE' },
  // NEET — Biology
  { id: 'seed-q-bio-1', text: 'Which organelle is the main site of aerobic respiration in a eukaryotic cell?', options: [['A', 'Ribosome'], ['B', 'Golgi apparatus'], ['C', 'Mitochondrion'], ['D', 'Lysosome']], correct: 'C', explanation: 'The Krebs cycle and oxidative phosphorylation take place in mitochondria.', subject: 'Biology', chapter: 'Cell: The Unit of Life', topic: 'Cell organelles', difficulty: 'EASY', marks: 4, negative: 1, category: 'NEET' },
  { id: 'seed-q-bio-2', text: 'The light-dependent reactions of photosynthesis occur in the:', options: [['A', 'Stroma'], ['B', 'Thylakoid membranes'], ['C', 'Outer chloroplast membrane'], ['D', 'Cytoplasm']], correct: 'B', explanation: 'Photosystems and the electron transport chain are located in the thylakoid membranes.', subject: 'Biology', chapter: 'Photosynthesis', topic: 'Light reactions', difficulty: 'MEDIUM', marks: 4, negative: 1, category: 'NEET' },
  { id: 'seed-q-bio-3', text: 'Which blood group is considered the universal red-cell donor?', options: [['A', 'AB positive'], ['B', 'O negative'], ['C', 'A negative'], ['D', 'B positive']], correct: 'B', explanation: 'O negative red cells lack A, B and RhD antigens.', subject: 'Biology', chapter: 'Body Fluids and Circulation', topic: 'Blood groups', difficulty: 'EASY', marks: 4, negative: 1, category: 'NEET' },
]

export async function seedContent(prisma: PrismaClient, ids: { orgId: string; batchId: string; studentId: string; student2Id: string; mentorId: string }) {
  const { orgId, batchId } = ids

  // Templates
  const templates = [
    { id: 'seed-tpl-plab', name: 'PLAB 1 Single Best Answer', examCategory: 'PLAB', mode: 'CBT' as const, totalDuration: 180, hasNegativeMarking: false,
      config: { sections: [{ name: 'Clinical Medicine', questionCount: 180, marksPerQuestion: 1 }], proctoring: { enableTabSwitchDetection: true, maxViolations: 3 } } },
    { id: 'seed-tpl-jee', name: 'JEE Main CBT Pattern', examCategory: 'JEE', mode: 'CBT' as const, totalDuration: 180, hasNegativeMarking: true,
      config: { sections: [{ name: 'Physics' }, { name: 'Chemistry' }, { name: 'Mathematics' }], proctoring: { enableTabSwitchDetection: true, maxViolations: 3 } } },
    { id: 'seed-tpl-neet', name: 'NEET UG OMR Pattern', examCategory: 'NEET', mode: 'OMR' as const, totalDuration: 200, hasNegativeMarking: true,
      config: { sections: [{ name: 'Physics' }, { name: 'Chemistry' }, { name: 'Biology' }] } },
    { id: 'seed-tpl-gate', name: 'GATE CBT Pattern', examCategory: 'GATE', mode: 'CBT' as const, totalDuration: 180, hasNegativeMarking: true,
      config: { virtualCalculatorEnabled: true, proctoring: { enableTabSwitchDetection: true, maxViolations: 3 } } },
  ]
  for (const t of templates) {
    const data = { ...t, config: JSON.stringify(t.config), organizationId: orgId }
    await prisma.examTemplate.upsert({ where: { id: t.id }, update: data, create: data })
  }

  // Question bank
  for (const q of QUESTIONS) {
    const data = {
      text: q.text,
      options: JSON.stringify((q.options ?? []).map(([id, text]) => ({ id, text }))),
      correctOption: q.correct,
      explanation: q.explanation,
      subject: q.subject,
      chapter: q.chapter,
      topic: q.topic,
      difficulty: q.difficulty,
      questionType: q.type ?? 'SINGLE_CHOICE',
      marks: q.marks,
      negativeMarks: q.negative,
      examCategory: q.category,
      tags: q.category.toLowerCase(),
      status: 'PUBLISHED',
      organizationId: orgId,
    }
    await prisma.question.upsert({ where: { id: q.id }, update: data, create: { id: q.id, ...data } })
  }

  // Tests
  const byPrefix = (p: string) => QUESTIONS.filter((q) => q.id.startsWith(p)).map((q) => q.id)
  const tests = [
    { id: 'seed-test-plab-1', title: 'PLAB 1 Mini Mock #1', description: '12 single-best-answer clinical scenarios across emergency medicine, cardiology and more.', duration: 20, type: 'MOCK' as const, mode: 'CBT' as const, templateId: 'seed-tpl-plab', questionIds: byPrefix('seed-q-plab-') },
    { id: 'seed-test-plab-2', title: 'PLAB 1 Emergency Medicine Drill', description: 'Quick-fire acute management questions.', duration: 8, type: 'PRACTICE' as const, mode: 'CBT' as const, templateId: 'seed-tpl-plab', questionIds: ['seed-q-plab-1', 'seed-q-plab-4', 'seed-q-plab-6', 'seed-q-plab-10', 'seed-q-plab-12'] },
    { id: 'seed-test-jee-1', title: 'JEE Main Mini Mock #1', description: 'Physics, Chemistry and Mathematics with numerical and multi-select questions.', duration: 30, type: 'MOCK' as const, mode: 'CBT' as const, templateId: 'seed-tpl-jee', questionIds: [...byPrefix('seed-q-phy-'), ...byPrefix('seed-q-chem-'), ...byPrefix('seed-q-math-')] },
    { id: 'seed-test-neet-1', title: 'NEET OMR Practice Sheet #1', description: 'Pen-and-paper style OMR practice across Physics, Chemistry and Biology.', duration: 15, type: 'PRACTICE' as const, mode: 'OMR' as const, templateId: 'seed-tpl-neet', questionIds: ['seed-q-phy-1', 'seed-q-phy-4', 'seed-q-chem-1', 'seed-q-chem-3', ...byPrefix('seed-q-bio-')] },
  ]
  const qById = new Map(QUESTIONS.map((q) => [q.id, q]))
  for (const t of tests) {
    const { questionIds, ...rest } = t
    const data = {
      ...rest,
      totalMarks: questionIds.reduce((s, id) => s + (qById.get(id)?.marks ?? 1), 0),
      status: 'ACTIVE' as const,
      isPublished: true,
      organizationId: orgId,
    }
    await prisma.test.upsert({ where: { id: t.id }, update: data, create: { ...data, batches: { connect: [{ id: batchId }] } } })
    await prisma.testQuestion.deleteMany({ where: { testId: t.id } })
    await prisma.testQuestion.createMany({
      data: questionIds.map((qid, order) => ({ testId: t.id, questionId: qid, order, section: qById.get(qid)?.subject ?? null })),
    })
  }

  // Graded demo attempts so analytics, mistakes and parent views have data
  const demoAttempts: { id: string; userId: string; testId: string; daysAgo: number; answers: Record<string, string> }[] = [
    { id: 'seed-attempt-1', userId: ids.studentId, testId: 'seed-test-plab-1', daysAgo: 9, answers: { 'seed-q-plab-1': 'B', 'seed-q-plab-2': 'A', 'seed-q-plab-3': 'B', 'seed-q-plab-4': 'A', 'seed-q-plab-5': 'B', 'seed-q-plab-6': 'B', 'seed-q-plab-7': 'D', 'seed-q-plab-8': 'B', 'seed-q-plab-10': 'B', 'seed-q-plab-11': 'C' } },
    { id: 'seed-attempt-2', userId: ids.studentId, testId: 'seed-test-jee-1', daysAgo: 5, answers: { 'seed-q-phy-1': 'B', 'seed-q-phy-2': '20', 'seed-q-phy-3': 'A', 'seed-q-phy-4': 'B', 'seed-q-chem-1': 'C', 'seed-q-chem-2': '3', 'seed-q-chem-3': 'A', 'seed-q-math-1': '-2', 'seed-q-math-2': 'B', 'seed-q-math-4': 'B' } },
    { id: 'seed-attempt-3', userId: ids.studentId, testId: 'seed-test-plab-2', daysAgo: 2, answers: { 'seed-q-plab-1': 'B', 'seed-q-plab-4': 'C', 'seed-q-plab-6': 'B', 'seed-q-plab-10': 'B', 'seed-q-plab-12': 'A' } },
    { id: 'seed-attempt-4', userId: ids.student2Id, testId: 'seed-test-plab-1', daysAgo: 7, answers: { 'seed-q-plab-1': 'B', 'seed-q-plab-2': 'B', 'seed-q-plab-3': 'B', 'seed-q-plab-4': 'C', 'seed-q-plab-5': 'B', 'seed-q-plab-6': 'B', 'seed-q-plab-7': 'C', 'seed-q-plab-8': 'B', 'seed-q-plab-9': 'A', 'seed-q-plab-10': 'B', 'seed-q-plab-11': 'C', 'seed-q-plab-12': 'B' } },
  ]

  for (const d of demoAttempts) {
    if (await prisma.attempt.findUnique({ where: { id: d.id } })) continue
    const test = tests.find((t) => t.id === d.testId)!
    const questions = await prisma.question.findMany({ where: { id: { in: test.questionIds } } })
    const answers = test.questionIds.map((qid) => ({ questionId: qid, selectedOpt: d.answers[qid] ?? null, timeSpent: 30 + ((qid.length * 7) % 60) }))
    const result = gradeAttempt(questions, answers)
    const start = new Date(Date.now() - d.daysAgo * 86400000)
    const end = new Date(start.getTime() + test.duration * 45000)

    await prisma.attempt.create({
      data: {
        id: d.id,
        userId: d.userId,
        testId: d.testId,
        mode: test.mode,
        status: 'COMPLETED',
        score: result.score,
        percentage: result.percentage,
        accuracy: result.accuracy,
        attemptedCount: result.attemptedCount,
        correctCount: result.correctCount,
        incorrectCount: result.incorrectCount,
        unattemptedCount: result.unattemptedCount,
        rank: 1,
        percentile: 100,
        subjectScores: JSON.stringify(result.subjectScores),
        chapterScores: JSON.stringify(result.chapterScores),
        topicScores: JSON.stringify(result.topicScores),
        weakTopics: JSON.stringify(result.weakTopics),
        strongTopics: JSON.stringify(result.strongTopics),
        startTime: start,
        endTime: end,
        createdAt: start,
        timeRemaining: 0,
        mentorComment: d.id === 'seed-attempt-1' ? 'Solid start. Revise meningococcal management and hyperkalaemia — both are high-yield for PLAB.' : null,
        answers: {
          create: answers.map((a) => ({
            questionId: a.questionId,
            selectedOpt: a.selectedOpt,
            timeSpent: a.timeSpent,
            status: a.selectedOpt ? 'ANSWERED' : 'NOT_VISITED',
            isCorrect: result.perQuestion[a.questionId].isCorrect,
            subject: result.perQuestion[a.questionId].subject,
            chapter: result.perQuestion[a.questionId].chapter,
            topic: result.perQuestion[a.questionId].topic,
          })),
        },
      },
    })
  }

  // Rank demo attempts per test by score
  for (const t of tests) {
    const done = await prisma.attempt.findMany({ where: { testId: t.id, status: 'COMPLETED', isRetry: false }, orderBy: { score: 'desc' } })
    for (const [i, a] of done.entries()) {
      const percentile = done.length > 1 ? Math.round(((done.length - 1 - i) / (done.length - 1)) * 1000) / 10 : 100
      await prisma.attempt.update({ where: { id: a.id }, data: { rank: i + 1, percentile } })
    }
  }

  // Announcements & resources
  const announcements = [
    { id: 'seed-ann-1', title: 'Full PLAB 1 mock this Sunday', body: 'A 180-question timed mock opens on Sunday at 10:00. Make sure you are on a laptop with a stable connection — the test runs in fullscreen.', audience: 'STUDENTS', priority: 'HIGH' },
    { id: 'seed-ann-2', title: 'Monthly progress reports', body: 'Report cards for October have been shared with parents via WhatsApp. Please reach out to your mentor with any questions.', audience: 'ALL', priority: 'NORMAL' },
  ]
  for (const a of announcements) {
    const data = { ...a, authorId: ids.mentorId, organizationId: orgId }
    await prisma.announcement.upsert({ where: { id: a.id }, update: data, create: data })
  }

  const resources = [
    { id: 'seed-res-1', title: 'NICE hypertension guideline (NG136)', url: 'https://www.nice.org.uk/guidance/ng136', category: 'Notes', subject: 'Cardiology', description: 'Diagnosis and step-wise management of hypertension in adults.' },
    { id: 'seed-res-2', title: 'Resuscitation Council UK — anaphylaxis', url: 'https://www.resus.org.uk/library/additional-guidance/guidance-anaphylaxis', category: 'Notes', subject: 'Emergency Medicine', description: 'Emergency treatment algorithm for anaphylaxis.' },
    { id: 'seed-res-3', title: 'GMC — PLAB 1 overview', url: 'https://www.gmc-uk.org/registration-and-licensing/join-the-register/plab/plab-1-guide', category: 'Syllabus', subject: 'PLAB', description: 'Official format and blueprint for PLAB part 1.' },
  ]
  for (const r of resources) {
    const data = { ...r, authorId: ids.mentorId, organizationId: orgId }
    await prisma.resource.upsert({ where: { id: r.id }, update: data, create: data })
  }

  // Study habits: exam date, a realistic activity history, a review queue and an open question report
  const DAY = 24 * 60 * 60 * 1000
  const dayKey = (d: Date) => d.toISOString().slice(0, 10)
  const now = new Date()
  await prisma.user.update({ where: { id: ids.studentId }, data: { targetExamDate: new Date(now.getTime() + 75 * DAY), dailyGoal: 30 } })

  await prisma.studyLog.deleteMany({ where: { userId: { in: [ids.studentId, ids.student2Id] } } })
  // Last 60 days: mostly active with a few gaps, and a 6-day streak running up to today
  const logs = []
  for (let i = 59; i >= 0; i--) {
    const skip = i > 6 && (i % 5 === 0 || i % 11 === 0)
    if (skip) continue
    const questions = i === 0 ? 12 : 10 + ((i * 7) % 35)
    logs.push({ userId: ids.studentId, day: dayKey(new Date(now.getTime() - i * DAY)), questions, reviews: i === 0 ? 4 : (i * 3) % 12 })
  }
  await prisma.studyLog.createMany({ data: logs })

  await prisma.reviewItem.deleteMany({ where: { userId: ids.studentId } })
  const missed = await prisma.answer.findMany({
    where: { attempt: { userId: ids.studentId }, isCorrect: false },
    select: { questionId: true },
    distinct: ['questionId'],
  })
  await prisma.reviewItem.createMany({
    data: missed.map((m, i) => ({
      userId: ids.studentId,
      questionId: m.questionId,
      // Two-thirds due now, the rest scheduled over the coming week
      dueAt: i % 3 === 2 ? new Date(now.getTime() + (i % 7 + 1) * DAY) : now,
      repetitions: i % 3 === 2 ? 1 : 0,
      intervalDays: i % 3 === 2 ? 1 : 0,
    })),
  })

  const reported = await prisma.question.findFirst({ where: { organizationId: orgId }, orderBy: { createdAt: 'asc' } })
  if (reported) {
    const data = {
      questionId: reported.id,
      userId: ids.student2Id,
      reason: 'UNCLEAR',
      details: 'Two of the options look equally correct based on the latest NICE guidance — could the explanation clarify why?',
      organizationId: orgId,
    }
    await prisma.questionReport.upsert({ where: { id: 'seed-report-1' }, update: data, create: { id: 'seed-report-1', ...data } })
  }
}

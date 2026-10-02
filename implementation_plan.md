# PLAB Quizzer / Mock Test Platform - Architecture & Implementation Plan

This document outlines the complete architectural design, database schema, API strategy, and implementation roadmap for the PLAB coaching institute mock test platform. The focus is on a reliable, fast, and exam-focused MVP.

## 1. System Architecture Overview

The system will follow a modern, scalable monolithic architecture (ideal for low user counts but high reliability).

**Tech Stack:**
*   **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, ShadCN UI
*   **State Management:** Zustand (for exam engine state), React Query (for server state/data fetching)
*   **Backend:** Next.js Route Handlers (API Routes) - acts as a BFF (Backend for Frontend)
*   **Database:** PostgreSQL (managed, e.g., Neon or Supabase)
*   **ORM:** Prisma
*   **Authentication:** NextAuth.js (Auth.js) using JWT strategy
*   **Hosting:** Vercel (Frontend + Serverless API)

**High-Level Flow:**
1.  Client makes requests to Next.js API Routes.
2.  NextAuth handles session validation (JWT).
3.  API Routes interact with PostgreSQL via Prisma ORM.
4.  Real-time autosave uses debounced API calls to prevent DB overload.

## 2. Folder Structure

A scalable structure using Next.js App Router conventions:

```text
plab-quizzer/
├── prisma/
│   └── schema.prisma        # Database schema
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (auth)/          # Authentication routes (login, register)
│   │   ├── (dashboard)/     # Protected dashboard layouts
│   │   │   ├── admin/
│   │   │   ├── mentor/
│   │   │   └── student/
│   │   ├── exam/            # Strict exam layout (no navbars, fullscreen)
│   │   │   └── [attemptId]/
│   │   └── api/             # Next.js Route Handlers
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # ShadCN components
│   │   ├── forms/           # Form components
│   │   ├── exam/            # Exam-specific components (timer, palette)
│   │   └── shared/          # Shared components (navbar, sidebar)
│   ├── lib/                 # Utility functions, Prisma client
│   │   ├── prisma.ts
│   │   ├── utils.ts
│   │   └── anti-cheat.ts    # Anti-cheating detection logic
│   ├── hooks/               # Custom React hooks (useExamTimer, useAutosave)
│   ├── store/               # Zustand stores
│   │   └── examStore.ts     # Local state for active exam session
│   ├── types/               # TypeScript interfaces/types
│   └── actions/             # Server actions (if preferred over API routes for some mutations)
├── public/                  # Static assets
├── .env                     # Environment variables
├── middleware.ts            # Next.js middleware for route protection
└── package.json
```

## 3. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  STUDENT
  MENTOR
  ADMIN
}

enum Status {
  PENDING
  APPROVED
  REJECTED
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  phone     String?
  role      Role     @default(STUDENT)
  status    Status   @default(PENDING)
  batchId   String?
  batch     Batch?   @relation(fields: [batchId], references: [id])
  attempts  Attempt[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Batch {
  id        String   @id @default(cuid())
  name      String   @unique
  users     User[]
  tests     Test[]   @relation("BatchTests")
  createdAt DateTime @default(now())
}

model Question {
  id            String   @id @default(cuid())
  text          String   // Rich text or markdown
  options       Json     // Array of { id, text }
  correctOption String   // ID of the correct option
  explanation   String?
  subject       String
  topic         String
  difficulty    String   // EASY, MEDIUM, HARD
  tags          String[]
  estimatedTime Int      // in seconds
  tests         TestQuestion[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Test {
  id          String   @id @default(cuid())
  title       String
  description String?
  duration    Int      // in minutes
  totalMarks  Int
  isPublished Boolean  @default(false)
  batches     Batch[]  @relation("BatchTests")
  questions   TestQuestion[]
  attempts    Attempt[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model TestQuestion {
  id         String   @id @default(cuid())
  testId     String
  test       Test     @relation(fields: [testId], references: [id])
  questionId String
  question   Question @relation(fields: [questionId], references: [id])
  order      Int      // To allow explicit ordering if needed
  
  @@unique([testId, questionId])
}

enum AttemptStatus {
  IN_PROGRESS
  PAUSED
  COMPLETED
  AUTO_SUBMITTED // Due to violation or time out
}

model Attempt {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  testId         String
  test           Test     @relation(fields: [testId], references: [id])
  status         AttemptStatus @default(IN_PROGRESS)
  score          Float?
  startTime      DateTime @default(now())
  endTime        DateTime?
  timeRemaining  Int      // Seconds left (updated periodically)
  answers        Answer[]
  violations     Violation[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model Answer {
  id           String   @id @default(cuid())
  attemptId    String
  attempt      Attempt  @relation(fields: [attemptId], references: [id])
  questionId   String
  selectedOpt  String?  // The ID of the selected option
  isCorrect    Boolean?
  timeSpent    Int      // Seconds spent on this question
  status       String   // SAVED, MARKED_FOR_REVIEW
  updatedAt    DateTime @updatedAt

  @@unique([attemptId, questionId])
}

model Violation {
  id          String   @id @default(cuid())
  attemptId   String
  attempt     Attempt  @relation(fields: [attemptId], references: [id])
  type        String   // TAB_SWITCH, BLUR, COPY_PASTE
  timestamp   DateTime @default(now())
}
```

## 4. API Routes

We will use RESTful Next.js API Routes (Route Handlers).

**Auth & Users:**
*   `POST /api/auth/register` - Student registration
*   `GET /api/users/pending` - List pending students (Admin/Mentor)
*   `PUT /api/users/:id/approve` - Approve student
*   `GET /api/users/me` - Get current user profile

**Questions (Admin/Mentor):**
*   `GET /api/questions` - List questions (with pagination/filters)
*   `POST /api/questions` - Create question
*   `POST /api/questions/bulk` - Bulk upload questions
*   `PUT /api/questions/:id` - Update question

**Tests:**
*   `GET /api/tests` - List available tests
*   `POST /api/tests` - Create test (Admin/Mentor)
*   `GET /api/tests/:id` - Get test details

**Exam Engine (Strictly Secured):**
*   `POST /api/attempts/start` - Initialize exam attempt, lock session, return randomized questions
*   `PUT /api/attempts/:id/sync` - Frequent autosave endpoint (debounced). Payload includes current `timeRemaining`, list of modified `Answer`s.
*   `POST /api/attempts/:id/violation` - Log a violation event.
*   `POST /api/attempts/:id/submit` - Final submission, trigger grading calculation.

**Analytics:**
*   `GET /api/analytics/student/:id` - Get student dashboard stats
*   `GET /api/analytics/test/:id` - Get test performance stats for batch

## 5. Authentication Design

*   **Framework:** NextAuth.js (v5 / Auth.js)
*   **Strategy:** JWT (JSON Web Tokens). Stateless is preferred for edge compatibility and speed.
*   **Flow:**
    1.  Credentials provider for Email/Password login.
    2.  `authorize` callback verifies password using `bcryptjs`.
    3.  Check `user.status === 'APPROVED'`. If pending, reject login with a specific error message.
    4.  JWT callback injects `role` and `id` into the token.
    5.  Session callback exposes `role` and `id` to the frontend client.
*   **Middleware:** Next.js `middleware.ts` intercepts all requests to `/dashboard/*` and `/exam/*`.
    *   Redirect unauthenticated to `/login`.
    *   Redirect `/dashboard/admin/*` if role != ADMIN.

## 6. Exam Engine Design

**State Management (Zustand):**
The exam client needs robust local state that survives brief network drops.
`useExamStore`:
*   `questions`: Array of questions (randomized options).
*   `answers`: Map of `questionId` -> `{ selectedOption, status, timeSpent }`.
*   `currentQuestionIndex`: number.
*   `timeRemaining`: number (decremented via `setInterval`).
*   `isOnline`: boolean (tracked via `window.addEventListener('online'/'offline')`).

**Autosave Strategy:**
*   When a user clicks an option or marks for review, update Zustand state immediately.
*   Use `lodash/debounce` to trigger `PUT /api/attempts/:id/sync` every 10-15 seconds OR on significant state change, sending only changed answers.
*   Store a backup of the current answers in `localStorage` in case the browser crashes.

**Network Interruption Logic:**
*   Listen to `offline` event. If offline, pause the timer, show a blocking modal: "Connection lost. Please wait while we reconnect."
*   Do not allow answering while offline to prevent synchronization conflicts.
*   On `online` event, immediately trigger a sync to backend. If sync succeeds, resume timer and remove modal.
*   If disconnect lasts longer than X minutes, backend should treat the attempt as PAUSED/AUTO_SUBMITTED based on policy.

## 7. Anti-Cheating Implementation

Implemented via a custom React hook: `useProctoring()`.

**Implementation Strategy:**
1.  **Fullscreen Enforcement:** Use HTML5 Fullscreen API on exam start.
    *   Listen to `fullscreenchange`. If user exits, log violation.
2.  **Tab Switch / Window Blur:** Listen to `window.onblur` and `document.onvisibilitychange`.
    *   If `document.hidden` becomes true, trigger violation.
3.  **Keyboard Restrictions:** Add global keydown event listener.
    *   `e.preventDefault()` for `e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'p')`.
    *   Block F12, Ctrl+Shift+I (DevTools).
4.  **Mouse Restrictions:**
    *   `document.addEventListener('contextmenu', e => e.preventDefault())`.
    *   `document.addEventListener('selectstart', e => e.preventDefault())`.
5.  **Violation Threshold Logic (Zustand):**
    *   Violation 1: Show Toast warning ("Please do not switch tabs").
    *   Violation 2: Show blocking Modal warning ("Final warning").
    *   Violation 3: Call `submitTest()` action automatically with reason `AUTO_SUBMITTED`.

## 8. UI Screen Breakdown

1.  **Public Auth:** Login, Register, Forgot Password.
2.  **Student Dashboard:**
    *   Overview (Cards: Avg Score, Total Tests).
    *   Pending Tests List.
    *   Completed Tests (links to detailed performance view).
3.  **Exam Interface (Dedicated Layout, No Navbar):**
    *   Top Bar: Test Name, Sticky Countdown Timer.
    *   Left Panel: Question Text, Options (Radio buttons).
    *   Right Sidebar: Question Palette (Grid of numbers, color-coded for Answered, Unanswered, Marked for Review).
    *   Bottom Bar: Previous, Mark for Review, Save & Next, Submit Test.
4.  **Post-Exam Analytics:**
    *   Score Breakdown, Percentile.
    *   Question-by-Question review (showing correct answer and explanation).
5.  **Mentor/Admin Dashboard:**
    *   Approvals queue (Table with Approve/Reject buttons).
    *   Test Manager (List tests, create new test, add questions).
    *   Question Bank (Data table with filters).
    *   Student Management.

## 9. Step-by-Step Build Roadmap

*   **Phase 1: Foundation (Week 1)**
    *   Initialize Next.js project with Tailwind & ShadCN.
    *   Setup Prisma, connect to PostgreSQL.
    *   Implement NextAuth with Role-Based Access Control.
    *   Build basic layout shells (Auth, Dashboard).
*   **Phase 2: Core Data Management (Week 2)**
    *   Develop API routes for Questions and Tests.
    *   Build Admin/Mentor UI to create questions and compile tests.
    *   Implement user approval workflow.
*   **Phase 3: The Exam Engine (Week 3)**
    *   Build the strict Exam UI Layout.
    *   Implement Zustand store for exam session state.
    *   Build the timer, palette, and navigation logic.
    *   Implement `useProctoring` hook (Anti-cheat).
    *   Implement Autosave and Network drop logic.
*   **Phase 4: Analytics & Polish (Week 4)**
    *   Build grading logic upon submission.
    *   Create detailed result view for students.
    *   Implement basic dashboard charts (Recharts).
    *   Final QA, performance testing, mobile-responsive checks.

## 10. Deployment Instructions

1.  **Database:** Provision a managed PostgreSQL database (Neon.tech or Supabase).
2.  **Repository:** Push code to GitHub.
3.  **Hosting:** Connect GitHub repo to Vercel.
4.  **Environment Variables (Vercel Settings):**
    ```env
    DATABASE_URL="postgres://user:pass@host/db"
    NEXTAUTH_SECRET="generate-a-strong-secret-using-openssl"
    NEXTAUTH_URL="https://your-production-url.com"
    ```
5.  **Build Command:** Vercel automatically detects Next.js. Ensure `prisma generate && prisma db push` (or `migrate deploy`) is run during the build step.
6.  **Deploy:** Trigger Vercel deployment.

## 11. Production Considerations

*   **Exam Stability:** The single point of failure is the database during mass autosaves. Debounce autosave logic (`lodash/debounce`) per user (e.g., every 15s) and batch updates if necessary.
*   **Time Synchronization:** The timer must rely on server time or calculate drift, not just `setInterval` on the client, as the client can modify browser time. Send `startTime` and `duration` from server, calculate `endTime`, and count down to that absolute time.
*   **Security:** Ensure Next.js API routes validate the user role before performing any action (e.g., only Admin can create questions).
*   **Data Integrity:** Use Prisma transactions when submitting a test to ensure the attempt status and answers are written atomically.

## 12. Recommended Improvements (Phase 2)

*   **AI Question Generation:** Allow mentors to paste a medical paragraph and auto-generate single-best-answer MCQs.
*   **Advanced Analytics:** Time-spent analysis per question to identify if a student is rushing or getting stuck on specific topics.
*   **Bulk Import:** CSV/Excel upload for questions to save mentor time.

## User Review Required
> [!IMPORTANT]
> Please review the proposed architecture, specifically the **Anti-Cheating Implementation** and **Network Failure Logic**. Let me know if these constraints meet the requirements for your institute before I begin scaffolding the application.

## Open Questions
> [!WARNING]
> 1. Should we use `bcrypt` for password hashing, or do you prefer a passwordless email magic link approach for simpler MVP login?
> 2. For the database, do you have a preference between Neon (Serverless Postgres) or Supabase?

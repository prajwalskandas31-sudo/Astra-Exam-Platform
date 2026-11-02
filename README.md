# Astra — Exam Platform

A multi-tenant CBT/OMR assessment platform for coaching institutes (PLAB, NEET, JEE, GATE and custom exams), with portals for students, faculty/mentors, institute admins and parents.

## Features

- **CBT exam engine**: fullscreen proctoring (tab switch / focus / fullscreen exit, auto-submit at the limit), 5-state question palette, autosave with offline backup and resume, auto-submit at 00:00, single/multi-select and numerical questions, keyboard shortcuts, GATE calculator.
- **OMR mode**: bubble-sheet simulation for pen-and-paper practice.
- **Results & analytics**: score, accuracy, rank/percentile, subject/chapter/difficulty breakdowns, weak/strong topics, answer review with explanations.
- **Practice tools**: targeted retests (wrong / skipped / weak topics), custom quiz builder (subject, topic, difficulty, unseen or previously-missed questions), mistakes notebook, bookmarks with notes.
- **Study plan**: exam-date countdown, daily question goal, study streak, 12-week activity heatmap and an explainable readiness score (50% recent accuracy, 30% syllabus coverage, 20% consistency).
- **Daily Review**: every question answered wrongly in a test is scheduled for spaced-repetition review (SM-2), with Again/Hard/Good/Easy grading and keyboard shortcuts.
- **Peer comparison**: on each result, you vs average vs topper (score, accuracy, time, per subject), a top-10 leaderboard, and per-question "% got it right / average time".
- **Question reports**: students flag wrong or unclear questions; faculty fix the answer key or explanation inline and resolve every report on that question.
- **Test results & item analysis**: per-test results table with CSV export, score distribution, and per-question difficulty, discrimination index and answer distribution, with automatic flags for suspect answer keys.
- **Faculty tools**: question bank (manual, JSON and AI PDF import), test builder with templates and scheduling, student reports with feedback, announcements, study-material library.
- **Admin tools**: organization branding, users and roles, batches, approvals, analytics, notification logs.
- **Parent portal**: linked children, report cards, weakness tracker, mock-test requests, and the child's study habits (streak, consistency, exam countdown, readiness).

## Getting started

```bash
npm install
npx prisma db push      # create/update the SQLite schema
npx prisma db seed      # demo institute, users, question bank, tests and sample results
npm run dev
```

### Environment variables (`.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | e.g. `file:./dev.db` |
| `NEXTAUTH_SECRET` | yes | session and report-link signing secret |
| `NEXTAUTH_URL` | production | public base URL used in report links |
| `GEMINI_API_KEY` | optional | enables AI extraction of questions from PDFs |

### Demo accounts (password `password123`)

| Role | Email |
| --- | --- |
| Student | `student@astra.com` |
| Mentor | `mentor@astra.com` |
| Faculty | `faculty@apex.com` |
| Institute admin | `admin@apex.com` |
| Parent (linked to the student) | `parent@astra.com` |
| Super admin | `superadmin@platform.com` |

New sign-ups: students and parents are active immediately; mentor sign-ups wait for admin approval. Admin roles can only be granted by an admin.

## Not yet connected

- **WhatsApp / email delivery** is simulated — messages are recorded in Admin → Notification Logs.
- **Payments** on the parent fees page are demo data; no gateway is connected.
- **Study materials** are shared as links (Drive, YouTube, PDFs); file upload needs a storage provider.

## Development note

If the project folder is synced by OneDrive, Turbopack's dev cache in `.next/` can be corrupted by the sync (symptoms: random 404s or `Failed to open SST file` in the dev log). Exclude `.next` from sync, move the project outside OneDrive, or use `npm run build && npm start`.

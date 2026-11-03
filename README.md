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

The app uses Postgres (Neon, provisioned through the Vercel Marketplace). There are two databases:
`astra-prod` for production only, and `astra-dev` for local development and preview deployments.

```bash
npm install
npx vercel link                      # once: link to the astra-exam-platform project
npx vercel env pull .env.local       # development variables (astra-dev database)
# Prisma's CLI reads .env, so copy DATABASE_URL and DATABASE_URL_UNPOOLED from .env.local into .env
npm run db:setup                     # apply migrations and seed demo data (dev database only)
npm run dev
```

Schema changes: edit `prisma/schema.prisma`, run `npx prisma migrate dev --name <change>`, and commit the
new folder in `prisma/migrations`. Every deploy runs `prisma migrate deploy` against its own database.

### Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | all | Postgres (pooled for the app, direct for migrations); set by the Neon integration |
| `NEXTAUTH_SECRET` | all | session, report-link and messaging-credential encryption key |
| `NEXTAUTH_URL` | production | public base URL used in WhatsApp/SMS links |
| `CRON_SECRET` | production | protects the weekly digest cron endpoint |
| `GEMINI_API_KEY` | optional | AI extraction of questions from PDFs |

WhatsApp/SMS credentials are not environment variables: each institute enters its own in Admin → WhatsApp & SMS
(stored encrypted).

### First admin in a new database

```bash
npx tsx prisma/create-admin.ts --institute "Apex Coaching" --name "Asha Rao" --email asha@apex.in
```

Prints a one-time password. Add `--super` for a platform super admin.

### Demo institute for sales demos

```bash
npx tsx prisma/seed-demo.ts   # with DATABASE_URL / DATABASE_URL_UNPOOLED pointing at the target database
```

Creates "Astra Demo Academy" in its own tenant: admin, faculty, mentor, parent and students on the reserved
`astra-demo.test` domain, the sample question bank and tests, graded attempts with a spread of scores, study history
and a review queue. No phone numbers (so no real WhatsApp/SMS) and no super admin. Prints fresh random passwords on
every run; re-run to reset the demo.

### Demo accounts (dev database only, password `password123`)

| Role | Email |
| --- | --- |
| Student | `student@astra.com` |
| Mentor | `mentor@astra.com` |
| Faculty | `faculty@apex.com` |
| Institute admin | `admin@apex.com` |
| Parent (linked to the student) | `parent@astra.com` |
| Super admin | `superadmin@platform.com` |

New sign-ups: students and parents are active immediately; mentor sign-ups wait for admin approval. Admin roles can only be granted by an admin.

## Deployment and CI

- Every pull request runs lint, typecheck, unit tests, migrations, build and Playwright end-to-end tests
  (`.github/workflows/ci.yml`, with a throwaway Postgres). `main` requires these checks to pass.
- Merging into `main` deploys production on Vercel (Singapore region, next to the database). PRs get preview deployments
  backed by the dev database.
- The weekly parent/student digest runs every Monday 09:00 IST via Vercel Cron (`vercel.json`).

## Messaging

Each institute connects its own WhatsApp (Meta Cloud API or Twilio) and SMS (MSG91 with DLT templates, or Twilio)
in Admin → WhatsApp & SMS. Messages are logged as *accepted* when a provider takes them and *delivered*, *read* or
*failed* when the provider reports back through the delivery-report URL shown on that page. Until an institute
connects a provider, messages are logged as skipped with the reason.

## Not yet connected

- **Payments** on the parent fees page are demo data; no gateway is connected.
- **Study materials** are shared as links (Drive, YouTube, PDFs); file upload needs a storage provider.

## Development note

If the project folder is synced by OneDrive, Turbopack's dev cache in `.next/` can be corrupted by the sync (symptoms: random 404s or `Failed to open SST file` in the dev log). Exclude `.next` from sync, move the project outside OneDrive, or use `npm run build && npm start`.

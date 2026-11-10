-- Institute toggles for Exam Centre mode and offline exams (both off by default)
ALTER TABLE "Organization" ADD COLUMN "examCentreEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "offlineExamsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- The institute's own student ID, unique within the institute
ALTER TABLE "User" ADD COLUMN "studentCode" TEXT;
CREATE UNIQUE INDEX "User_organizationId_studentCode_key" ON "User"("organizationId", "studentCode");
CREATE INDEX "User_studentCode_idx" ON "User"("studentCode");

-- Shuffling and Exam Centre settings per test (existing tests keep their fixed order)
ALTER TABLE "Test" ADD COLUMN "shuffleMode" TEXT NOT NULL DEFAULT 'OFF';
ALTER TABLE "Test" ADD COLUMN "shuffleOptions" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Test" ADD COLUMN "setCount" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "Test" ADD COLUMN "centreExam" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Test" ADD COLUMN "startCode" TEXT;
ALTER TABLE "Test" ADD COLUMN "allowOffline" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Test" ADD COLUMN "centreRooms" TEXT;

-- Per-attempt paper layout and device tracking
ALTER TABLE "Attempt" ADD COLUMN "paperSeed" TEXT;
ALTER TABLE "Attempt" ADD COLUMN "setCode" TEXT;
ALTER TABLE "Attempt" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "Attempt" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "Attempt" ADD COLUMN "offline" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ExamSeat" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,
    "setIndex" INTEGER NOT NULL,
    "downloadedAt" TIMESTAMP(3),
    CONSTRAINT "ExamSeat_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExamSeat_testId_userId_key" ON "ExamSeat"("testId", "userId");
CREATE UNIQUE INDEX "ExamSeat_testId_room_row_col_key" ON "ExamSeat"("testId", "room", "row", "col");
CREATE INDEX "ExamSeat_userId_idx" ON "ExamSeat"("userId");
ALTER TABLE "ExamSeat" ADD CONSTRAINT "ExamSeat_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamSeat" ADD CONSTRAINT "ExamSeat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PendingSubmission" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "answeredCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckpointAt" TIMESTAMP(3),
    "onTimePayload" TEXT,
    "error" TEXT,
    "attemptId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "PendingSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PendingSubmission_testId_userId_key" ON "PendingSubmission"("testId", "userId");
CREATE INDEX "PendingSubmission_status_receivedAt_idx" ON "PendingSubmission"("status", "receivedAt");
CREATE INDEX "PendingSubmission_userId_idx" ON "PendingSubmission"("userId");
ALTER TABLE "PendingSubmission" ADD CONSTRAINT "PendingSubmission_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PendingSubmission" ADD CONSTRAINT "PendingSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

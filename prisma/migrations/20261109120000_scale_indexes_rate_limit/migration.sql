-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");

-- CreateIndex
CREATE INDEX "User_organizationId_role_idx" ON "User"("organizationId", "role");

-- CreateIndex
CREATE INDEX "User_batchId_idx" ON "User"("batchId");

-- CreateIndex
CREATE INDEX "ParentStudentLink_studentId_idx" ON "ParentStudentLink"("studentId");

-- CreateIndex
CREATE INDEX "Batch_organizationId_idx" ON "Batch"("organizationId");

-- CreateIndex
CREATE INDEX "ExamTemplate_organizationId_idx" ON "ExamTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "Question_organizationId_subject_topic_idx" ON "Question"("organizationId", "subject", "topic");

-- CreateIndex
CREATE INDEX "Question_examCategory_idx" ON "Question"("examCategory");

-- CreateIndex
CREATE INDEX "Test_organizationId_isPublished_idx" ON "Test"("organizationId", "isPublished");

-- CreateIndex
CREATE INDEX "Test_ownerId_idx" ON "Test"("ownerId");

-- CreateIndex
CREATE INDEX "Test_templateId_idx" ON "Test"("templateId");

-- CreateIndex
CREATE INDEX "TestQuestion_questionId_idx" ON "TestQuestion"("questionId");

-- CreateIndex
CREATE INDEX "Attempt_userId_status_idx" ON "Attempt"("userId", "status");

-- CreateIndex
CREATE INDEX "Attempt_testId_status_score_idx" ON "Attempt"("testId", "status", "score");

-- CreateIndex
CREATE INDEX "Attempt_userId_testId_idx" ON "Attempt"("userId", "testId");

-- CreateIndex
CREATE INDEX "Answer_questionId_idx" ON "Answer"("questionId");

-- CreateIndex
CREATE INDEX "Violation_attemptId_idx" ON "Violation"("attemptId");

-- CreateIndex
CREATE INDEX "TestRequest_userId_status_idx" ON "TestRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "NotificationLog_recipientUserId_idx" ON "NotificationLog"("recipientUserId");

-- CreateIndex
CREATE INDEX "Bookmark_questionId_idx" ON "Bookmark"("questionId");

-- CreateIndex
CREATE INDEX "Announcement_organizationId_createdAt_idx" ON "Announcement"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Announcement_authorId_idx" ON "Announcement"("authorId");

-- CreateIndex
CREATE INDEX "Resource_organizationId_idx" ON "Resource"("organizationId");

-- CreateIndex
CREATE INDEX "Resource_authorId_idx" ON "Resource"("authorId");

-- CreateIndex
CREATE INDEX "ReviewItem_questionId_idx" ON "ReviewItem"("questionId");

-- CreateIndex
CREATE INDEX "QuestionReport_questionId_idx" ON "QuestionReport"("questionId");

-- CreateIndex
CREATE INDEX "QuestionReport_userId_idx" ON "QuestionReport"("userId");

-- CreateIndex
CREATE INDEX "ReportLink_studentId_idx" ON "ReportLink"("studentId");


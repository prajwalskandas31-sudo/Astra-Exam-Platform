-- The previous migration backfilled join codes with random(), which is not a cryptographically
-- secure generator. Clear them: the app issues a new code on first use with crypto.randomBytes
-- (ensureJoinCode in src/lib/institutes.ts). Codes are only seconds old when this runs in a deploy.
UPDATE "Organization" SET "joinCode" = NULL;

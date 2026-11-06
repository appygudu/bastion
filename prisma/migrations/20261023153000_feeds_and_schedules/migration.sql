ALTER TABLE "User" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'free';

CREATE TABLE "ScanSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "cadence" TEXT NOT NULL DEFAULT 'weekly',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeedSnapshot" (
    "id" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScanSchedule_userId_url_key" ON "ScanSchedule"("userId", "url");
CREATE INDEX "ScanSchedule_enabled_nextRunAt_idx" ON "ScanSchedule"("enabled", "nextRunAt");

ALTER TABLE "ScanSchedule" ADD CONSTRAINT "ScanSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

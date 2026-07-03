-- AlterEnum
ALTER TYPE "CareEventType" ADD VALUE IF NOT EXISTS 'sleep';

-- AlterTable
ALTER TABLE "care_records" ADD COLUMN IF NOT EXISTS "ended_at" TIMESTAMP(3);

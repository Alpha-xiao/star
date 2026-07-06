-- AlterEnum：为 RecordSource 增加 backfill 值，用于标记历史补录记录
ALTER TYPE "RecordSource" ADD VALUE IF NOT EXISTS 'backfill';

-- CreateEnum
CREATE TYPE "CareEventType" AS ENUM ('poop', 'pee', 'breastfeeding', 'formula');

-- CreateEnum
CREATE TYPE "BreastSide" AS ENUM ('left', 'right', 'both');

-- CreateEnum
CREATE TYPE "RecordSource" AS ENUM ('web', 'pwa');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('pending', 'synced', 'failed');

-- CreateEnum
CREATE TYPE "SyncTarget" AS ENUM ('jijyun_webhook', 'tencent_doc');

-- CreateEnum
CREATE TYPE "SyncLogStatus" AS ENUM ('success', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "nickname" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "babies" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "birthday" DATE,
    "gender" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "babies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_records" (
    "id" UUID NOT NULL,
    "client_id" TEXT NOT NULL,
    "baby_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_type" "CareEventType" NOT NULL,
    "happened_at" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "side" "BreastSide",
    "amount" INTEGER,
    "note" TEXT,
    "source" "RecordSource" NOT NULL DEFAULT 'pwa',
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'pending',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_sync_logs" (
    "id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "target" "SyncTarget" NOT NULL,
    "status" "SyncLogStatus" NOT NULL,
    "request_payload" JSONB NOT NULL,
    "response_body" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "babies_owner_id_idx" ON "babies"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "care_records_client_id_key" ON "care_records"("client_id");

-- CreateIndex
CREATE INDEX "care_records_baby_id_happened_at_idx" ON "care_records"("baby_id", "happened_at" DESC);

-- CreateIndex
CREATE INDEX "care_records_user_id_happened_at_idx" ON "care_records"("user_id", "happened_at" DESC);

-- CreateIndex
CREATE INDEX "care_records_sync_status_idx" ON "care_records"("sync_status");

-- CreateIndex
CREATE INDEX "external_sync_logs_record_id_idx" ON "external_sync_logs"("record_id");

-- AddForeignKey
ALTER TABLE "babies" ADD CONSTRAINT "babies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_records" ADD CONSTRAINT "care_records_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_records" ADD CONSTRAINT "care_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_sync_logs" ADD CONSTRAINT "external_sync_logs_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "care_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

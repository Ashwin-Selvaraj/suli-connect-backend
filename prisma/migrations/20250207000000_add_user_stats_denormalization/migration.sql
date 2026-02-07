-- AlterTable: add denormalized stats columns for fast /me
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tasks_completed_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "days_worked_count" INTEGER NOT NULL DEFAULT 0;

-- Backfill: populate from task_verifications and attendance
UPDATE "users" u
SET "tasks_completed_count" = COALESCE(
  (SELECT COUNT(*)::integer FROM "task_verifications" tv
   WHERE tv."assignee_id" = u."id" AND tv."approved" = true),
  0
);

UPDATE "users" u
SET "days_worked_count" = COALESCE(
  (SELECT COUNT(*)::integer FROM "attendance" a
   WHERE a."user_id" = u."id"),
  0
);

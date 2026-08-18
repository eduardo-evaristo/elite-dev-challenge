-- AlterTable
ALTER TABLE "events" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "events" ADD COLUMN "eventClassification" TEXT NOT NULL DEFAULT '';
ALTER TABLE "events" ADD COLUMN "description" TEXT;
ALTER TABLE "events" ADD COLUMN "duration" INTEGER NOT NULL DEFAULT 0;

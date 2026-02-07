-- AlterTable: Make email optional and add Telegram fields
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Add Telegram authentication fields
ALTER TABLE "User" ADD COLUMN "telegramId" BIGINT;
ALTER TABLE "User" ADD COLUMN "telegramUsername" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramChatId" BIGINT;
ALTER TABLE "User" ADD COLUMN "telegramPhotoUrl" TEXT;

-- CreateIndex for Telegram ID (unique)
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex for faster lookups
CREATE INDEX "User_telegramId_idx" ON "User"("telegramId");

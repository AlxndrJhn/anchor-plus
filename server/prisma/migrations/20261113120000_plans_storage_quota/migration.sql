-- An account's plan, and an admin's own storage limit for it (MB).
CREATE TYPE "Plan" AS ENUM ('free', 'plus');

ALTER TABLE "User" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'free';
ALTER TABLE "User" ADD COLUMN "storageQuotaMb" INTEGER;

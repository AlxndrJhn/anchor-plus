-- Accounts link to sign-in providers by issuer and subject, one row per
-- provider, instead of a single subject on the user.

-- CreateTable
CREATE TABLE "OidcIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OidcIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OidcIdentity_issuer_subject_key" ON "OidcIdentity"("issuer", "subject");

-- CreateIndex
CREATE INDEX "OidcIdentity_userId_idx" ON "OidcIdentity"("userId");

-- AddForeignKey
ALTER TABLE "OidcIdentity" ADD CONSTRAINT "OidcIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing links came from the one provider there was, whose issuer the
-- database may not know (it can be set on the server only). They keep an
-- empty issuer until that provider, now the first, signs the person in again.
INSERT INTO "OidcIdentity" ("id", "userId", "issuer", "subject", "createdAt")
SELECT gen_random_uuid()::text, "id", '', "oidcSubject", CURRENT_TIMESTAMP
FROM "User"
WHERE "oidcSubject" IS NOT NULL;

-- DropIndex
DROP INDEX "User_oidcSubject_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "oidcSubject";

-- Sessions signed in through an OIDC provider remember which one and its
-- session, for signing out there too (RP-initiated logout) and for its
-- back-channel logout.
ALTER TABLE "RefreshToken" ADD COLUMN "oidcProvider" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "oidcSid" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "oidcIdToken" TEXT;

-- CreateIndex
CREATE INDEX "RefreshToken_oidcSid_idx" ON "RefreshToken"("oidcSid");

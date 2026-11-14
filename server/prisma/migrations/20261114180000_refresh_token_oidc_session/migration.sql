-- Sessions signed in through the OIDC provider remember its session, for
-- signing out there too (RP-initiated logout) and for its back-channel logout.
ALTER TABLE "RefreshToken" ADD COLUMN "viaOidc" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RefreshToken" ADD COLUMN "oidcSid" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "oidcIdToken" TEXT;

-- CreateIndex
CREATE INDEX "RefreshToken_oidcSid_idx" ON "RefreshToken"("oidcSid");

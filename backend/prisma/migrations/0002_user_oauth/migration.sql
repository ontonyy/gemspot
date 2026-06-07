-- OAuth support: provider + providerId, and make local password optional
-- (OAuth-only accounts have no passwordHash).
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "provider" TEXT;
ALTER TABLE "users" ADD COLUMN "providerId" TEXT;

-- One account per (provider, providerId) pair.
CREATE UNIQUE INDEX "users_provider_providerId_key" ON "users"("provider", "providerId");

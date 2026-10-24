-- Seal v2 columns. Safe to run once on an existing database; existing rows become version 1.
ALTER TABLE "steganography_metadata" ADD COLUMN IF NOT EXISTS "seal_version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "steganography_metadata" ADD COLUMN IF NOT EXISTS "signing_key_id" VARCHAR(64);
ALTER TABLE "steganography_metadata" ADD COLUMN IF NOT EXISTS "signature" VARCHAR(128);

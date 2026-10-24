-- CLEANUP FIRST
DROP TABLE IF EXISTS "admin_audit_logs" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "steganography_metadata" CASCADE;
DROP TABLE IF EXISTS "histories" CASCADE;
DROP TABLE IF EXISTS "certificates" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Certificate" CASCADE;
DROP TABLE IF EXISTS "History" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "SteganographyMetadata" CASCADE;
DROP TABLE IF EXISTS "AdminAuditLog" CASCADE;

DROP TYPE IF EXISTS "Role" CASCADE;
DROP TYPE IF EXISTS "Status" CASCADE;
DROP TYPE IF EXISTS "NotificationType" CASCADE;

-- ENUMS
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'DINAS');
CREATE TYPE "Status" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'TRANSFER_PENDING', 'AWAITING_RECIPIENT');
CREATE TYPE "NotificationType" AS ENUM ('CERTIFICATE_VERIFIED', 'CERTIFICATE_REJECTED', 'CERTIFICATE_PENDING', 'TRANSFER_REQUEST', 'SYSTEM_ALERT');

-- USERS
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CERTIFICATES
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "nomor_sertifikat" VARCHAR(50) NOT NULL,
    "nama_lahan" VARCHAR(200) NOT NULL,
    "luas_tanah" VARCHAR(50) NOT NULL,
    "lokasi" VARCHAR(500) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "image_url" TEXT,
    "stego_key" TEXT,
    "keterangan" TEXT,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "transfer_to_email" VARCHAR(255),
    "encrypted_data" TEXT,
    "stego_image_url" TEXT,
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- Partial Unique Index: Only enforce uniqueness for VERIFIED certificates
CREATE UNIQUE INDEX "unique_verified_cert" ON "certificates"("nomor_sertifikat") WHERE status = 'VERIFIED';

CREATE INDEX "certificates_owner_id_idx" ON "certificates"("owner_id");
CREATE INDEX "certificates_status_idx" ON "certificates"("status");
CREATE INDEX "certificates_created_at_idx" ON "certificates"("created_at");
CREATE INDEX "certificates_nomor_sertifikat_idx" ON "certificates"("nomor_sertifikat");
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- HISTORIES
CREATE TABLE "histories" (
    "id" TEXT NOT NULL,
    "certificate_id" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "actor_email" TEXT,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "owner_name" VARCHAR(200),
    "owner_email" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "histories_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "histories_certificate_id_idx" ON "histories"("certificate_id");
CREATE INDEX "histories_created_at_idx" ON "histories"("created_at");
ALTER TABLE "histories" ADD CONSTRAINT "histories_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- STEGANOGRAPHY METADATA
CREATE TABLE "steganography_metadata" (
    "id" TEXT NOT NULL,
    "certificate_id" TEXT NOT NULL,
    "algorithm" VARCHAR(50) NOT NULL,
    "encryption_key" TEXT NOT NULL,
    "original_image" VARCHAR(500),
    "stego_image" VARCHAR(500) NOT NULL,
    "encryption_algo" VARCHAR(50),
    "hash_value" VARCHAR(128),
    "seal_version" INTEGER NOT NULL DEFAULT 1,
    "signing_key_id" VARCHAR(64),
    "signature" VARCHAR(128),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_verified" TIMESTAMP(3),

    CONSTRAINT "steganography_metadata_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "steganography_metadata_certificate_id_key" ON "steganography_metadata"("certificate_id");
CREATE INDEX "steganography_metadata_certificate_id_idx" ON "steganography_metadata"("certificate_id");
ALTER TABLE "steganography_metadata" ADD CONSTRAINT "steganography_metadata_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NOTIFICATIONS
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "certificate_id" TEXT,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ADMIN AUDIT LOGS
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(50),
    "target_id" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "admin_audit_logs_admin_id_idx" ON "admin_audit_logs"("admin_id");
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

# PANDUAN INSTALASI & MENJALANKAN PROYEK
### Aplikasi Sertifikat Tanah Digital (Steganografi & Kriptografi)

Dokumentasi ini berisi langkah-langkah lengkap untuk meng-clone, mengkonfigurasi, dan menjalankan aplikasi ini di komputer lokal Anda.

---

## 1. PRASYARAT (Requirements)

Pastikan komputer Anda sudah terinstall:
- **Node.js**: Versi 18.17 atau lebih baru (Recomendasi: v20.x). Cek dengan `node -v`
- **Git**: Untuk clone repository.
- **Akun Supabase**: Untuk Database (PostgreSQL) dan Storage.

---

## 2. INSTALASI PROJECT

1. **Clone Repository**
   Buka terminal akses folder tujuan, lalu jalankan:
   ```bash
   git clone https://github.com/username-anda/repo-ini.git
   cd web-kripto-steganografi-sertifikat
   ```

2. **Install Dependencies**
   Jalankan perintah ini untuk menginstall semua library yang dibutuhkan:
   ```bash
   npm install
   ```

---

## 3. KONFIGURASI ENVIRONTMENT (.env)

Buat file bernama `.env` di root folder proyek. Copy-paste konfigurasi berikut dan isi sesuai data Supabase Anda.

```env
# 1. DATABASE CONNECTION (Supabase > Project Settings > Database > Connection String > URI)
# Gunakan Mode: Transaction (Port 6543)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

# Gunakan Mode: Session (Port 5432) - Untuk keperluan Migrasi/Prisma Push
DIRECT_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"

# 2. SUPABASE CLIENT (Supabase > Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[isi-anon-public-key-anda]"

# 3. SUPABASE ADMIN (Supabase > Project Settings > API > service_role secret)
# PENTING: Jangan bagikan key ini ke siapapun! Digunakan untuk bypass RLS (Upload file private).
SUPABASE_SERVICE_ROLE_KEY="[isi-service-role-secret-anda]"

# 4. KEAMANAN (Kriptografi)
# Kunci AES-256 (Harus 32 bytes = 64 karakter Hex).
# Contoh bisa generate di terminal: openssl rand -hex 32
STEGANOGRAPHY_KEY="a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890"

# Opsional: Jika error sertifikat SSL lokal
NODE_TLS_REJECT_UNAUTHORIZED="0"
```

---

## 4. SETUP DATABASE (QUERY SQL)

Anda punya dua opsi:
- **Opsi A (Otomatis)**: Jalankan `npx prisma db push` (Memerlukan `DIRECT_URL` yang benar).
- **Opsi B (Manual)**: Jalankan query SQL di perawah ini di **Supabase SQL Editor**.

**SQL Query (Untuk Opsi B):**

Silakan copy-paste script ini ke SQL Editor di Dashboard Supabase untuk membuat tabel secara manual.

```sql
-- 1. Buat ENUMs
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'DINAS');
CREATE TYPE "Status" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'TRANSFER_PENDING', 'AWAITING_RECIPIENT');
CREATE TYPE "NotificationType" AS ENUM ('CERTIFICATE_VERIFIED', 'CERTIFICATE_REJECTED', 'CERTIFICATE_PENDING', 'TRANSFER_REQUEST', 'SYSTEM_ALERT');

-- 2. Tabel Users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- 3. Tabel Certificates
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
    -- Info Verifikasi/Reject
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    -- Info Transfer
    "transfer_to_email" VARCHAR(255),
    "transfer_reason" VARCHAR(50),
    -- Stego Metadata
    "encrypted_data" TEXT,
    "stego_image_url" TEXT,
    -- Timestamps
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- Indexing Certificates
CREATE INDEX "certificates_owner_id_idx" ON "certificates"("owner_id");
CREATE INDEX "certificates_status_idx" ON "certificates"("status");
CREATE INDEX "certificates_created_at_idx" ON "certificates"("created_at");
CREATE INDEX "certificates_nomor_sertifikat_idx" ON "certificates"("nomor_sertifikat");

-- Foreign Key Certificates
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Tabel Histories
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

-- 5. Tabel SteganographyMetadata
CREATE TABLE "steganography_metadata" (
    "id" TEXT NOT NULL,
    "certificate_id" TEXT NOT NULL,
    "algorithm" VARCHAR(50) NOT NULL,
    "encryption_key" TEXT NOT NULL,
    "original_image" VARCHAR(500),
    "stego_image" VARCHAR(500) NOT NULL,
    "encryption_algo" VARCHAR(50),
    "hash_value" VARCHAR(128),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_verified" TIMESTAMP(3),

    CONSTRAINT "steganography_metadata_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "steganography_metadata_certificate_id_key" ON "steganography_metadata"("certificate_id");
CREATE INDEX "steganography_metadata_certificate_id_idx" ON "steganography_metadata"("certificate_id");
ALTER TABLE "steganography_metadata" ADD CONSTRAINT "steganography_metadata_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Tabel Notifications
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

-- 7. Tabel AdminAuditLogs
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
```

---

## 5. SETUP STORAGE (Supabase Buckets)

Aplikasi ini membutuhkan **2 BUAH BUCKET** di Supabase Storage:

### Bucket 1: `certificates` (PUBLIC)
- **Tujuan**: Menyimpan file sertifikat yang sudah diverifikasi (Stego Image) agar bisa didownload user/publik.
- **Setting**:
  - Name: `certificates`
  - Public Bucket: **ON** (Centang "Public bucket")

### Bucket 2: `pending-uploads` (PRIVATE) - *PENTING!*
- **Tujuan**: Menyimpan file upload mentah dari user sebelum diverifikasi. File ini **TIDAK BOLEH** diakses publik langsung.
- **Setting**:
  - Name: `pending-uploads`
  - Public Bucket: **OFF** (Jangan centang).
  - Pastikan menggunakan `SUPABASE_SERVICE_ROLE_KEY` di `.env` agar server bisa mengakses bucket ini.

---

## 6. MENJALANKAN APLIKASI

Setelah semua setup selesai:

1. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```

2. **Buka di Browser**:
   Akses `http://localhost:3000`.

3. **Login Akun Admin**:
   Anda bisa register manual, lalu mengubah role user tersebut menjadi `ADMIN` langsung di Database (Tabel `users`, kolom `role`).

---

## CATATAN PENTING
- **Upload File**: Gunakan format **.PNG** agar fitur Steganografi bekerja normal.
- **Troubleshooting Push DB**: Jika `npx prisma db push` gagal, pastikan `DIRECT_URL` (Port 5432) sudah benar. Transaction poolers (Port 6543) tidak support migrasi struktur tabel.

Selamat mencoba! 🚀

# DOKUMENTASI APLIKASI SERTIFIKAT TANAH DIGITAL

Dokumentasi ini mencakup detail fitur, alur pengguna, dan penjelasan teknis mendalam mengenai sistem keamanan (Steganografi & Enkripsi) seperti yang terimplementasi dalam codebase saat ini.

---

## BAGIAN 1: Daftar Fitur Aplikasi

### === FITUR APLIKASI SERTIFIKAT TANAH DIGITAL ===

#### A. FITUR USER (Role: USER)
1. **Authentication**
   - Register akun baru
   - Login (cookie sesi bertanda tangan JWT HS256, httpOnly; role selalu dicek ulang ke database)
   - Logout
   - **Status**: ✅ Implemented

2. **Dashboard User**
   - Ringkasan sertifikat yang dimiliki
   - Status sertifikat (Pending, Verified, Rejected)
   - **Status**: ✅ Implemented

3. **Manajemen Sertifikat**
   - **Upload**: Form pengajuan sertifikat baru (Image upload ke Local/Supabase)
   - **List**: Melihat daftar sertifikat milik sendiri
   - **Detail**: Melihat detail informasi sertifikat dan riwayat (history)
   - **Edit**: Mengubah data sertifikat yang masih berstatus PENDING
   - **Delete**: Menghapus sertifikat yang berstatus PENDING atau REJECTED
   - **Download**: Mengunduh gambar sertifikat (Asli atau yang sudah disisipi Steganografi)
   - **Status**: ✅ Implemented

4. **Transfer Kepemilikan (Jual Beli/Wakaf/Warisan)**
   - **Request**: Pemilik mengajukan transfer ke email penerima dengan alasan (Jual Beli, dll)
   - **Accept**: Penerima menyetujui permintaan transfer (Status berubah menjadi MENUNGGU VERIFIKASI ADMIN)
   - **Reject**: Penerima menolak transfer
   - **Status**: ✅ Implemented

5. **Verifikasi Sertifikat**
   - Upload gambar sertifikat (PNG) untuk divalidasi
   - Sistem melakukan ekstraksi Steganografi & Dekripsi
   - Validasi data digital signature (Hash) & kecocokan data database
   - **Status**: ✅ Implemented

#### B. FITUR ADMIN (Role: ADMIN)
1. **Dashboard Admin**
   - Statistik total sertifikat, user, dan distribusi status
   - Grafik tren pendaftaran bulanan
   - Statistik transfer aset
   - **Status**: ✅ Implemented

2. **Manajemen Sertifikat**
   - Melihat semua sertifikat dalam sistem
   - Filter & Search sertifikat
   - Mendeteksi duplikasi nomor sertifikat
   - **Status**: ✅ Implemented

3. **Persetujuan (Approval)**
   - Review sertifikat PENDING atau TRANSFER_PENDING
   - **Approve**: Memicu proses encoding Steganografi & Enkripsi
   - **Reject**: Menolak sertifikat dengan alasan spesifik
   - **Status**: ✅ Implemented

4. **Audit & History**
   - Melihat riwayat pendaftaran, perubahan, dan transfer
   - Melihat log aksi admin
   - **Status**: ✅ Implemented

#### C. FITUR SISTEM (Background/Core)
1. **Steganografi (LSB)**
   - Metode: Least Significant Bit (LSB) pada channel RGB
   - Library: `pngjs`
   - **Status**: ✅ Implemented

2. **Keamanan (Encryption & Integrity)**
   - Enkripsi Payload: AES-256-GCM
   - Integritas: GCM Auth Tag + SHA-256 Hash stored in DB
   - **Status**: ✅ Implemented

3. **Storage**
   - Upload image ke Supabase Storage (sebelumnya Local Support juga ada)
   - **Status**: ✅ Implemented

4. **Database**
   - Relational DB (Postgres) via Prisma ORM
   - Tabel: User, Certificate, History, SteganographyMetadata, Notification
   - **Status**: ✅ Implemented

---

## BAGIAN 2: User Flow / Cara Pakai Aplikasi

### === USER JOURNEY / CARA PAKAI APLIKASI ===

#### SCENARIO 1: User Baru Upload Sertifikat
1. User register/login ke aplikasi.
2. Masuk ke halaman **Dashboard** atau **Sertifikat Saya**.
3. Klik tombol **"Tambah Sertifikat"**.
4. Isi form:
   - Upload Foto Sertifikat (JPG/PNG).
   - Nomor Sertifikat.
   - Nama Hak/Lahan.
   - Luas Tanah.
   - Alamat/Lokasi.
   - Asal Hak (Warisan/Jual Beli/dll).
5. Submit. Sistem menyimpan data dengan status **PENDING**.
6. User menunggu proses verifikasi oleh Admin.

#### SCENARIO 2: Admin Approve Sertifikat (Encoding Process)
1. Admin login dan masuk ke menu **Persetujuan**.
2. Klik **"Lihat Detail"** pada sertifikat berstatus PENDING.
3. Review data dan gambar.
4. Klik tombol **"Setujui Sertifikat"** (Verify).
5. **[SYSTEM BACKGROUND PROCESS]**:
   - Sistem mengambil gambar asli.
   - Sistem membuat payload JSON berisi data sertifikat & riwayat.
   - Payload di-hash (SHA-256) untuk integritas.
   - Payload dienkripsi dengan **AES-256-GCM**.
   - Encrypted data disisipkan ke gambar menggunakan teknik **LSB Steganography**.
   - Gambar baru (Stego Image) diupload ke Supabase (bucket `certificates`).
   - Database diupdate: URL gambar diganti dengan URL Stego Image, status menjadi **VERIFIED**, metadata steganografi disimpan.
6. Notifikasi dikirim ke User bahwa sertifikat telah diverifikasi.

#### SCENARIO 3: User Download & Verifikasi Sertifikat
1. User (Pemilik) masuk ke dashboard, pilih sertifikat **VERIFIED**.
2. Klik **"Unduh Sertifikat"** untuk mendapatkan file PNG yang sudah mengandung data tersembunyi.
3. User (atau pihak ketiga) membuka menu **Verifikasi**.
4. Upload file PNG tersebut.
5. **[SYSTEM BACKGROUND PROCESS]**:
   - Sistem mengekstrak bit LSB dari gambar.
   - Sistem mendeteksi format enkripsi (`IV:AuthTag:Ciphertext`).
   - Decrypt payload menggunakan AES-256-GCM.
   - Sistem mencari ID sertifikat di database.
   - Sistem membandingkan data:
     - Nomor Sertifikat (Gambar vs DB).
     - Owner ID (Mendeteksi apakah kepemilikan sudah berubah/gambar lama).
     - Hash Integrity (Mendeteksi apakah data JSON dalam gambar dimanipulasi).
6. Hasil ditampilkan:
   - **VALID**: Data cocok, sertifikat asli.
   - **INVALID/TAMPERED**: Data tidak ditemukan atau integritas hash tidak sesuai.

#### SCENARIO 4: Transfer Sertifikat
1. Pemilik sertifikat (Status VERIFIED) membuka detail sertifikat.
2. Klik tombol **"Transfer"**.
3. Masukkan email penerima dan alasan transfer (misal: Jual Beli).
4. Penerima mendapat notifikasi.
5. Penerima login, melihat sertifikat dengan status **AWAITING RECIPIENT**.
6. Penerima klik **"Terima Transfer"**. Status berubah menjadi **TRANSFER_PENDING**.
7. Admin melihat request transfer di dashboard.
8. Admin melakukan Approval.
   - Sistem melakukan re-encoding steganografi dengan data pemilik BARU.
   - Status kembali menjadi **VERIFIED** dengan pemilik baru.

---

## BAGIAN 3: Cara Kerja Kode - FITUR INTI (Steganografi & Verifikasi)

### === TECHNICAL DEEP DIVE: STEGANOGRAFI & VERIFIKASI ===

Berbeda dengan asumsi awal (API Routes), aplikasi ini menggunakan **Next.js Server Actions** untuk keamanan dan integritas data yang lebih baik. Logic enkripsi dilakukan *inline* di dalam action untuk memastikan kunci enkripsi tidak pernah terekspos ke client.

#### A. ENCODING & ENCRYPTION FLOW (Saat Admin Approve)
**File Utama**: `src/lib/actions/certificates.ts` (Fungsi `updateCertificateStatus`)
**Helper**: `src/lib/steganography.ts`

**Proses Detail:**

1. **Persiapan Data Payload**:
   Data sertifikat dikumpulkan menjadi objek JSON:
   ```typescript
   const payload = {
       certId: id,
       ownerId: owner.id,
       ownerName: owner.name,
       verifiedAt: new Date(),
       validator: admin.name,
       serial: cert.nomor_sertifikat,
       transactionType: cert.transfer_reason,
       history: [...] // Ringkasan riwayat
   };
   const payloadStr = JSON.stringify(payload);
   ```

2. **Hashing (Integrity Check)**:
   Membuat SHA-256 hash dari payload mentah. Hash ini disimpan di database (`SteganographyMetadata`) untuk validasi nanti.
   ```typescript
   const hashValue = crypto.createHash('sha256').update(payloadStr).digest('hex');
   ```

3. **AES-256-GCM Encryption**:
   Mengenkripsi payload JSON agar tidak bisa dibaca begitu saja jika diekstrak.
   ```typescript
   const key = Buffer.from(process.env.STEGANOGRAPHY_KEY, 'hex');
   const iv = crypto.randomBytes(12); // Initialization Vector
   const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
   
   let encrypted = cipher.update(payloadStr, 'utf8', 'hex');
   encrypted += cipher.final('hex');
   const authTag = cipher.getAuthTag().toString('hex'); // GCM Auth Tag
   
   // Format Final: IV:AuthTag:Back-to-back-Ciphertext
   const securePayload = `${iv.toString('hex')}:${authTag}:${encrypted}`;
   ```

4. **LSB Embedding**:
   Menggunakan `Steganography.embed` di `src/lib/steganography.ts`.
   - Mengubah `securePayload` (string) menjadi buffer.
   - Menambahkan header `STEGOv1` dan panjang pesan (32-bit integer).
   - Iterasi pixel gambar (Channel R, G, B).
   - Mengganti bit terakhir (LSB) dari setiap byte warna dengan bit pesan.

5. **Upload & Sync**:
   Gambar hasil steganografi diupload ke Supabase, dan URL-nya disimpan menggantikan gambar lama.

#### B. DECODING & VERIFICATION FLOW (Saat User Upload)
**File Utama**: `src/lib/actions/certificates.ts` (Fungsi `verifyCertificateImage`)

**Proses Detail:**

1. **LSB Extraction**:
   Menggunakan `Steganography.reveal` di `src/lib/steganography.ts`.
   - Membaca LSB dari setiap channel RGB.
   - Mencari header `STEGOv1`.
   - Membaca panjang pesan (32-bit).
   - Mengekstrak pesan tersembunyi (String terenkripsi).

2. **De-structure & Decryption**:
   Memecah string format `IV:AuthTag:Ciphertext`.
   ```typescript
   const [ivHex, authTagHex, encryptedHex] = revealedMessage.split(':');
   const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
   decipher.setAuthTag(Buffer.from(authTagHex, 'hex')); // Validasi GCM Tag
   
   let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
   decrypted += decipher.final('utf8');
   const hiddenData = JSON.parse(decrypted);
   ```

3. **Multi-Layer Validation**:
   - **Cek Database**: Apakah `certId` ada di DB?
   - **Cek Serial**: Apakah `hiddenData.serial` === `db.nomor_sertifikat`?
   - **Cek Kepemilikan (Ownership)**: Apakah `hiddenData.ownerId` === `db.ownerId`? (Jika beda, berarti gambar lama/sudah dijual).
   - **Cek Integritas (Hash)**:
     ```typescript
     const recalculatedHash = crypto.createHash('sha256').update(JSON.stringify(hiddenData)).digest('hex');
     if (recalculatedHash !== db.steganographyMetadata.hashValue) {
         // TAMPER DETECTED
     }
     ```

---

## BAGIAN 4: File Structure & Dependencies

### === FILE STRUCTURE PENTING ===

```
src/
├── app/
│   ├── (auth)/             # Halaman Login/Register
│   ├── (main)/             # Halaman User (Dashboard, Sertifikat, Verifikasi)
│   └── admin/              # Halaman Admin (Dashboard, Approval)
├── lib/
│   ├── actions/
│   │   └── certificates.ts # [CORE] Logic Approval, Encrypt, Decrypt, Verifikasi
│   ├── steganography.ts    # [CORE] Low-level LSB Bit Manipulation (pngjs)
│   ├── prisma.ts           # DB Connection
│   └── supabase.ts         # Storage Connection
└── prisma/
    └── schema.prisma       # Definisi Database Schema
```

### === DEPENDENCIES ===

*   **pngjs**: Manipulasi buffer gambar PNG (akses pixel level).
*   **crypto**: (Node.js Built-in) Untuk AES-256-GCM dan SHA-256.
*   **@prisma/client**: Interaksi database.
*   **@supabase/supabase-js**: Upload file storage.
*   **next**: Framework utama (menggunakan App Router & Server Actions).

---

**DISCLAIMER**:
Dokumentasi ini dibuat berdasarkan analisis codebase terbaru (`src/lib/actions/certificates.ts` dan `src/lib/steganography.ts`). Beberapa asumsi awal mengenai struktur folder API (`/api/admin/...`) telah dikoreksi menjadi **Server Actions** sesuai implementasi aktual.

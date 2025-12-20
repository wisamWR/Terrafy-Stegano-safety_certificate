
// Tipe Data untuk Status Transaksi
// - pending_user: Menunggu persetujuan User B (Penerima)
// - pending_admin: User B setuju, Menunggu verifikasi Admin
// - success: Admin setuju, kepemilikan pindah
// - rejected: Ditolak oleh User B atau Admin
export type TransactionStatus = 'pending_user' | 'pending_admin' | 'success' | 'rejected';

// Tipe Data untuk Jenis Transfer
export type TransferType = 'Jual Beli' | 'Hibah' | 'Wakaf';

// Interface User (Sederhana)
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin' | 'dinas';
    avatar?: string;
}

// Interface Riwayat Kepemilikan (History di dalam Sertifikat)
export interface OwnershipHistory {
    ownerId: string;
    name: string;
    email: string;
    date: string; // Format: "DD MMMM YYYY HH:mm:ss"
    type: TransferType | 'Sertifikat Diterbitkan';
    note: string;
}

// Interface Utama: Sertifikat
export interface Certificate {
    id: string;
    nomor: string;      // e.g., "111/SRTV/X/2006"
    nama: string;       // e.g., "Sertifikat Rumah Induk"

    ownerId: string;    // ID Pemilik saat ini (Relasi ke User)

    // Data Fisik
    location: string;   // Alamat teks
    luas: string;       // e.g., "100 m2"
    keterangan: string;

    // Metadata Sistem
    image: string;      // URL Foto fisik sertifikat
    stegoImage?: string; // URL Gambar steganografi (Future implementation)
    uploadDate: string; // Format: "DD MMMM YYYY HH:mm:ss"

    // Status Kunci (PENTING untuk mencegah Double Spending)
    // Jika true, tombol transfer harus disable
    isLocked: boolean;

    history: OwnershipHistory[];
}

// Interface Timeline Transaksi
export interface TransactionTimeline {
    status: string; // 'created' | 'recipient_accepted' | 'admin_verified' | 'rejected'
    date: string;
    title: string;
    desc: string;
}

// Interface Transaksi (Penyambung User A -> User B -> Admin)
export interface Transaction {
    id: string;
    certificateId: string;

    senderId: string;
    recipientEmail: string; // Input awal user hanya email
    recipientId?: string;   // Terisi jika email valid dan user ketemu

    type: TransferType;
    note: string;

    status: TransactionStatus;

    createdAt: string; // Format: "DD MMMM YYYY HH:mm:ss"
    updatedAt: string; // Format: "DD MMMM YYYY HH:mm:ss"

    timeline?: TransactionTimeline[];
}

// --- DUMMY DATA ---

export const DUMMY_USERS: User[] = [
    { id: 'u1', name: 'Ridelo', email: 'ridelo@gmail.com', role: 'user', avatar: '/avatars/01.png' },
    { id: 'u2', name: 'Budi Santoso', email: 'budi@gmail.com', role: 'user', avatar: '/avatars/02.png' },
    { id: 'u3', name: 'Siti Aminah', email: 'siti@gmail.com', role: 'user', avatar: '/avatars/03.png' },
    { id: 'a1', name: 'Admin Pusat', email: 'admin@bps.go.id', role: 'admin' },
];

export const DUMMY_CERTIFICATES: Certificate[] = [
    {
        id: 'c1',
        nomor: '111/SRTV/X/2006',
        nama: 'Tanah Warisan Kakek',
        ownerId: 'u1', // Milik Ridelo
        location: 'Jl. Merdeka No. 10, Semarang',
        luas: '500 m2',
        keterangan: 'Tanah pekarangan siap bangun',
        image: '/certificate_dummy.png', // Updated to use the generated asset
        uploadDate: '15 Januari 2024 08:30:45',
        isLocked: false, // Aman, bisa ditransfer
        history: [
            {
                ownerId: 'u1',
                name: 'Ridelo',
                email: 'ridelo@gmail.com',
                date: '15 Januari 2024 08:30:45',
                type: 'Sertifikat Diterbitkan',
                note: 'Penerbitan sertifikat baru'
            }
        ]
    },
    {
        id: 'c2',
        nomor: '222/SRTV/XI/2010',
        nama: 'Ruko Simpang Lima',
        ownerId: 'u1', // Sudah pindah ke Ridelo (Success)
        location: 'Kawasan Simpang Lima, Semarang',
        luas: '120 m2',
        keterangan: 'Ruko 3 lantai',
        image: '/certificate_dummy.png',
        uploadDate: '20 November 2023 14:15:30',
        isLocked: false, // Unlock karena sudah selesai
        history: [
            {
                ownerId: 'u1',
                name: 'Ridelo',
                email: 'ridelo@gmail.com',
                date: '02 Februari 2024 10:00:00', // Sesuai timeline akhir TRX-001 (estimasi)
                type: 'Jual Beli',
                note: 'Pembelian Lunas'
            },
            {
                ownerId: 'u2',
                name: 'Budi Santoso',
                email: 'budi@gmail.com',
                date: '20 November 2023 14:15:30',
                type: 'Sertifikat Diterbitkan',
                note: 'Penerbitan sertifikat baru'
            }
        ]
    },
    {
        id: 'c3',
        nomor: '333/SRTV/XII/2015',
        nama: 'Sertifikat Kebun Teh',
        ownerId: 'u3',
        location: 'Wonosobo, Jawa Tengah',
        luas: '2000 m2',
        keterangan: 'Kebun produktif',
        image: '/certificate_dummy.png',
        uploadDate: '01 Januari 2024 10:00:00',
        isLocked: false, // Unlock karena ditolak (Available)
        history: [
            {
                ownerId: 'u3',
                name: 'Siti Aminah',
                email: 'siti@gmail.com',
                date: '01 Januari 2015 10:00:00',
                type: 'Sertifikat Diterbitkan',
                note: 'Penerbitan sertifikat baru'
            }
        ]
    }
];

export const DUMMY_TRANSACTIONS: Transaction[] = [
    {
        id: 'TRX-001',
        certificateId: 'c2', // Ruko Simpang Lima
        senderId: 'u2',      // Budi Santoso
        recipientEmail: 'ridelo@gmail.com',
        recipientId: 'u1',   // Ridelo
        type: 'Jual Beli',
        note: 'Pembayaran sudah lunas via transfer bank BCA',
        status: 'success',
        createdAt: '2024-02-01 10:00:25',
        updatedAt: '2024-02-01 14:05:12',
        timeline: [
            {
                status: 'created',
                date: '2024-02-01 10:00:00',
                title: 'Pengajuan Dibuat',
                desc: 'Budi Santoso mengajukan transfer'
            },
            {
                status: 'pending_user',
                date: '2024-02-01 10:05:00',
                title: 'Menunggu Konfirmasi',
                desc: 'Menunggu konfirmasi dari Ridelo'
            },
            {
                status: 'recipient_accepted',
                date: '2024-02-01 14:05:00',
                title: 'Konfirmasi Penerima',
                desc: 'Ridelo menyetujui transfer'
            },
            {
                status: 'pending_admin',
                date: '2024-02-01 14:05:00',
                title: 'Menunggu Verifikasi Admin',
                desc: 'Menunggu verifikasi admin BPN'
            },
            {
                status: 'admin_verified',
                date: '2024-02-02 10:00:00',
                title: 'Verifikasi Admin',
                desc: 'Admin menyetujui perpindahan hak'
            }
        ]
    },
    {
        id: 'TRX-002',
        certificateId: 'c1', // Rumah Mewah
        senderId: 'u1',      // Ridelo
        recipientEmail: 'siti@gmail.com',
        recipientId: 'u3',   // Siti Aminah
        type: 'Hibah',
        note: 'Untuk pembangunan masjid',
        status: 'pending_user',
        createdAt: '2024-02-02 09:00:15',
        updatedAt: '2024-02-02 09:00:15',
        timeline: [
            {
                status: 'created',
                date: '2024-02-02 09:00:00',
                title: 'Pengajuan Dibuat',
                desc: 'Ridelo mengajukan transfer'
            },
            {
                status: 'pending_user',
                date: '2024-02-02 09:05:00',
                title: 'Menunggu Konfirmasi',
                desc: 'Menunggu konfirmasi dari Siti Aminah'
            }
        ]
    },
    {
        id: 'TRX-003',
        certificateId: 'c3', // Sertifikat Kebun Teh
        senderId: 'u3',      // Siti Aminah
        recipientEmail: 'budi@gmail.com',
        recipientId: 'u2',   // Budi Santoso
        type: 'Jual Beli',
        note: 'Dokumen pendukung kurang lengkap', // [Admin Input]
        status: 'rejected',
        createdAt: '2024-01-05 08:00:00',
        updatedAt: '2024-01-06 10:00:00',
        timeline: [
            {
                status: 'created',
                date: '2024-01-05 08:00:00',
                title: 'Pengajuan Dibuat',
                desc: 'Siti Aminah mengajukan transfer'
            },
            {
                status: 'pending_user',
                date: '2024-01-05 08:05:00',
                title: 'Menunggu Konfirmasi',
                desc: 'Menunggu konfirmasi dari Budi Santoso'
            },
            {
                status: 'recipient_accepted',
                date: '2024-01-05 10:30:00',
                title: 'Konfirmasi Penerima',
                desc: 'Budi Santoso menyetujui transfer'
            },
            {
                status: 'pending_admin',
                date: '2024-01-05 10:35:00',
                title: 'Menunggu Verifikasi Admin',
                desc: 'Menunggu verifikasi admin BPN'
            },
            {
                status: 'rejected',
                date: '2024-01-06 10:00:00',
                title: 'Ditolak',
                desc: 'Dokumen pendukung kurang lengkap'
            }
        ]
    },
    {
        id: 'TRX-004', // Success example
        certificateId: 'c1',
        senderId: 'u1',
        recipientEmail: 'siti@gmail.com',
        recipientId: 'u3',
        type: 'Hibah',
        note: 'Hibah tanah warisan',
        status: 'success',
        createdAt: '2023-12-10 09:00:00',
        updatedAt: '2023-12-12 14:00:00',
        timeline: [
            {
                status: 'created',
                date: '2023-12-10 09:00:00',
                title: 'Pengajuan Dibuat',
                desc: 'Ridelo mengajukan transfer'
            },
            {
                status: 'pending_user',
                date: '2023-12-10 09:05:00',
                title: 'Menunggu Konfirmasi',
                desc: 'Menunggu konfirmasi dari Siti Aminah'
            },
            {
                status: 'recipient_accepted',
                date: '2023-12-10 10:30:00',
                title: 'Konfirmasi Penerima',
                desc: 'Siti Aminah menyetujui transfer'
            },
            {
                status: 'pending_admin',
                date: '2023-12-10 10:35:00',
                title: 'Menunggu Verifikasi Admin',
                desc: 'Menunggu verifikasi admin BPN'
            },
            {
                status: 'admin_verified',
                date: '2023-12-12 14:00:00',
                title: 'Verifikasi Admin',
                desc: 'Admin menyetujui perpindahan hak'
            }
        ]
    }
];

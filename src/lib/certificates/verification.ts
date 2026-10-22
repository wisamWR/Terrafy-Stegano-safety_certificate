import prisma from "@/lib/prisma"
import { Steganography } from "@/lib/steganography"
import { fail } from "./common"
import { hashPayload, openPayload } from "./payload"
import { PENDING_PREFIX, type CertificateStorage } from "./storage"

/**
 * Public check of an uploaded certificate image:
 *  1. extract the LSB payload, 2. decrypt + authenticate it (AES-GCM, our secret key),
 *  3. compare with the database. An authentic image whose seal is no longer the current one
 *  (ownership moved on, or a newer seal was issued) is reported as not current and its
 *  owner details are withheld.
 */
export async function verifyCertificateImage(image: Buffer, storage: CertificateStorage) {
    let revealed: string
    try {
        revealed = await Steganography.reveal(image)
    } catch {
        return fail("Tidak ditemukan data tersembunyi. Sertifikat mungkin bukan asli atau gambar telah dimodifikasi.")
    }

    const hidden = openPayload(revealed)
    if (!hidden) {
        return fail("Gagal memproses data sertifikat. Gambar mungkin rusak, dipalsukan, atau menggunakan kunci enkripsi yang berbeda.", {
            code: "FAIL_DECRYPT_OR_PARSE",
        })
    }

    const { certId, ownerId, serial } = hidden
    if (typeof certId !== "string" || !certId) return fail("Data sertifikat tidak lengkap dalam gambar.")

    const certificate = await prisma.certificate.findUnique({
        where: { id: certId },
        include: {
            owner: { select: { name: true, email: true } },
            history: { orderBy: { createdAt: "desc" } },
            steganographyMetadata: { select: { hashValue: true }, take: 1 },
        },
    })
    if (!certificate) return fail("Sertifikat tidak ditemukan di database (ID tidak valid).")

    if (certificate.nomor_sertifikat !== serial) {
        return fail("Data tidak cocok! Nomor sertifikat dalam gambar berbeda dengan database.", {
            details: { imageSerial: serial, dbSerial: certificate.nomor_sertifikat },
        })
    }

    // The GCM tag already proves the payload is genuine; the hash tells whether it is the *latest* seal.
    const currentHash = certificate.steganographyMetadata[0]?.hashValue
    const isLatestSeal = !currentHash || currentHash === hashPayload(hidden)
    const isCurrent = certificate.ownerId === ownerId && isLatestSeal

    const ownerName = isCurrent ? (certificate.owner.name || certificate.owner.email) : "Terproteksi (Pemilik Telah Berubah)"
    const ownerEmail = isCurrent ? certificate.owner.email : "Privasi Dilindungi"

    let imageUrl = certificate.image_url
    if (imageUrl?.startsWith(PENDING_PREFIX)) {
        imageUrl = isCurrent
            ? (await storage.signPendingUrl(imageUrl.slice(PENDING_PREFIX.length), 3600)) ?? imageUrl
            : "/placeholder_secure.png"
    }

    const history = (isCurrent ? certificate.history : []).map((h) => ({
        name: h.owner_name || h.actor_name,
        email: h.owner_email || h.actor_email,
        type: h.action,
        date: h.createdAt.toLocaleDateString("id-ID"),
        note: h.note,
    }))

    return {
        success: true as const,
        isOwnerMatch: isCurrent,
        imageOwnerName: typeof hidden.ownerName === "string" ? hidden.ownerName : "Tidak diketahui",
        ownerName,
        ownerEmail,
        status: certificate.status,
        transferToEmail: certificate.transferToEmail,
        certificate: {
            id: certificate.id,
            nama: certificate.nama_lahan,
            nomor: certificate.nomor_sertifikat,
            luas: certificate.luas_tanah,
            location: certificate.lokasi,
            keterangan: certificate.keterangan,
            image_url: imageUrl,
            ownerName,
            ownerEmail,
            status: certificate.status,
            history,
            transferReason: certificate.transferReason,
            conflicts: [],
            createdAt: certificate.createdAt,
            updatedAt: certificate.updatedAt,
        },
    }
}

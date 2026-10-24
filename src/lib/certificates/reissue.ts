import prisma from "@/lib/prisma"
import { DEFAULT_KEYRING, type Keyring } from "@/lib/seal/public-keys"
import { type Actor, fail } from "./common"
import { createSealedImage, loadSealSubject } from "./sealing"
import type { CertificateStorage } from "./storage"

/**
 * Replaces a legacy v1 seal with a signed v2 seal, built on the current sealed image.
 * The new image is uploaded first; metadata is swapped in one transaction afterwards, so any
 * failure leaves the v1 seal valid.
 */
export async function reissueSeal(admin: Actor, certId: string, storage: CertificateStorage, keyring: Keyring = DEFAULT_KEYRING) {
    const cert = await loadSealSubject(certId)
    if (!cert) return fail("Sertifikat tidak ditemukan")
    if (cert.status !== "VERIFIED") return fail("Hanya sertifikat terverifikasi yang dapat diterbitkan ulang segelnya")

    const current = cert.steganographyMetadata[0]
    if (!current) return fail("Sertifikat belum memiliki segel. Setujui ulang untuk menerbitkan segel.")
    if (current.sealVersion >= 2) return fail("Segel sertifikat ini sudah versi terbaru")

    try {
        const sealed = await createSealedImage(admin.name || "Admin", cert, storage, keyring)

        await prisma.$transaction([
            prisma.steganographyMetadata.delete({ where: { id: current.id } }),
            prisma.steganographyMetadata.create({
                data: {
                    certificateId: cert.id,
                    originalImage: cert.image_url,
                    stegoImage: sealed.publicUrl,
                    createdBy: admin.id,
                    lastVerified: new Date(),
                    ...sealed.metadata,
                },
            }),
            prisma.certificate.update({
                where: { id: cert.id },
                data: { image_url: sealed.publicUrl, stegoImageUrl: sealed.publicUrl },
            }),
            prisma.notification.create({
                data: {
                    userId: cert.ownerId,
                    certificateId: cert.id,
                    title: "Segel Diperbarui",
                    message: `Segel digital sertifikat ${cert.nama_lahan} (${cert.nomor_sertifikat}) telah diperbarui. Unduh gambar sertifikat terbaru.`,
                    type: "SYSTEM_ALERT",
                },
            }),
            prisma.adminAuditLog.create({
                data: {
                    adminId: admin.id,
                    action: "REISSUE_SEAL",
                    targetType: "Certificate",
                    targetId: cert.id,
                    details: { certificateNumber: cert.nomor_sertifikat, fromVersion: 1, toVersion: 2, kid: sealed.metadata.signingKeyId },
                },
            }),
        ])
        return { success: true as const }
    } catch (error) {
        console.error("[SEAL] Reissue failed:", error)
        return fail("Gagal menerbitkan ulang segel: " + (error as Error).message)
    }
}

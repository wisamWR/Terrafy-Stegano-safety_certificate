import prisma from "@/lib/prisma"
import { DEFAULT_KEYRING, type Keyring } from "@/lib/seal/public-keys"
import { type Actor, fail } from "./common"
import { createSealedImage, loadSealSubject } from "./sealing"
import type { CertificateStorage } from "./storage"

const STALE_MESSAGE = "Segel sudah diperbarui atau status sertifikat berubah, muat ulang halaman"

/** Thrown inside the transaction when the certificate changed while the new image was being sealed. */
class StaleSealError extends Error {}

const staleFailure = () => fail(STALE_MESSAGE, { code: "STALE" })

/**
 * Replaces a legacy v1 seal with a signed v2 seal, built on the current sealed image.
 * The new image is uploaded first; metadata is swapped in one transaction afterwards, so any
 * failure leaves the v1 seal valid. The transaction re-checks that the certificate is still
 * VERIFIED with the same owner and that the v1 row is still the one we sealed from.
 *
 * The encrypted `validator` in the new seal becomes the reissuing admin's name.
 * A failed or losing reissue may leave an unreferenced object in the verified bucket
 * (the storage interface has no removeVerified yet).
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

        await prisma.$transaction(async (tx) => {
            // Still VERIFIED with the same owner? Otherwise someone changed it while we were sealing.
            const { count: updated } = await tx.certificate.updateMany({
                where: { id: cert.id, status: "VERIFIED", ownerId: cert.ownerId },
                data: { image_url: sealed.publicUrl, stegoImageUrl: sealed.publicUrl },
            })
            if (updated === 0) throw new StaleSealError()

            // The v1 row must still be the one we sealed from (concurrent reissue or transfer approval).
            // Throwing rolls back the image update above.
            const { count: removed } = await tx.steganographyMetadata.deleteMany({ where: { id: current.id } })
            if (removed === 0) throw new StaleSealError()

            await tx.steganographyMetadata.create({
                data: {
                    certificateId: cert.id,
                    // cover this stego image was built from (the v1 sealed image)
                    originalImage: cert.image_url,
                    stegoImage: sealed.publicUrl,
                    createdBy: admin.id,
                    lastVerified: new Date(),
                    ...sealed.metadata,
                },
            })
            await tx.notification.create({
                data: {
                    userId: cert.ownerId,
                    certificateId: cert.id,
                    title: "Segel Diperbarui",
                    message: `Segel digital sertifikat ${cert.nama_lahan} (${cert.nomor_sertifikat}) telah diperbarui. Unduh gambar sertifikat terbaru. Gambar lama tidak berlaku lagi untuk verifikasi.`,
                    type: "SYSTEM_ALERT",
                },
            })
            await tx.adminAuditLog.create({
                data: {
                    adminId: admin.id,
                    action: "REISSUE_SEAL",
                    targetType: "Certificate",
                    targetId: cert.id,
                    details: { certificateNumber: cert.nomor_sertifikat, fromVersion: current.sealVersion, toVersion: 2, kid: sealed.metadata.signingKeyId },
                },
            })
        })
        return { success: true as const }
    } catch (error) {
        console.error("[SEAL] Reissue failed:", error)
        const code = (error as { code?: string }).code
        if (error instanceof StaleSealError || code === "P2025" || code === "P2002") return staleFailure()
        return fail("Gagal menerbitkan ulang segel: " + (error as Error).message)
    }
}

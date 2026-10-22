import type { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { Steganography } from "@/lib/steganography"
import { type Actor, fail } from "./common"
import { type CertificatePayload, hashPayload, sealPayload } from "./payload"
import { getCertificateDetail } from "./queries"
import { type CertificateStorage, PENDING_BUCKET, readImage, resolveImageSource } from "./storage"

export type ReviewDecision = "VERIFIED" | "REJECTED"

/**
 * Admin decision on a certificate.
 *  - PENDING / REJECTED / VERIFIED  -> VERIFIED or REJECTED (registration review, revoke, reinstate)
 *  - TRANSFER_PENDING + VERIFIED    -> ownership moves to the recipient, a new stego seal is issued
 *  - TRANSFER_PENDING + REJECTED    -> transfer cancelled, certificate stays VERIFIED with its owner
 *  - AWAITING_RECIPIENT             -> refused: the recipient has not answered yet
 * A VERIFIED certificate whose seal is missing (earlier embed failure) is re-sealed on re-approval.
 */
export async function reviewCertificate(
    admin: Actor,
    certId: string,
    decision: ReviewDecision,
    note: string | undefined,
    storage: CertificateStorage,
) {
    const existing = await prisma.certificate.findUnique({
        where: { id: certId },
        include: { steganographyMetadata: { select: { id: true }, take: 1 } },
    })
    if (!existing) return fail("Sertifikat tidak ditemukan")
    if (existing.status === "AWAITING_RECIPIENT") {
        return fail("Transfer masih menunggu konfirmasi penerima")
    }

    const hasSeal = existing.steganographyMetadata.length > 0
    const isTransfer = existing.status === "TRANSFER_PENDING"

    if (existing.status === decision) {
        const needsReseal = decision === "VERIFIED" && !hasSeal && !!existing.image_url
        if (!needsReseal) return currentDetail(admin, certId, storage)
    } else {
        const outcome = await applyDecision(admin, existing, decision, note, isTransfer)
        if ("error" in outcome) return outcome
    }

    if (decision === "VERIFIED") {
        const sealed = await issueSealIfMissing(admin, certId, storage)
        if ("error" in sealed) return sealed
    }

    if (existing.status !== decision) {
        await notifyAndAudit(admin, certId, decision, note)
    }

    return currentDetail(admin, certId, storage)
}

async function currentDetail(admin: Actor, certId: string, storage: CertificateStorage) {
    const detail = await getCertificateDetail(admin, certId, storage)
    return detail.success ? { success: true as const, certificate: detail.certificate } : detail
}

async function applyDecision(
    admin: Actor,
    existing: { id: string; status: string; transferToEmail: string | null; verifiedAt: Date | null },
    decision: ReviewDecision,
    note: string | undefined,
    isTransfer: boolean,
) {
    const now = new Date()
    const data: Prisma.CertificateUncheckedUpdateManyInput = {}
    let action = decision === "VERIFIED" ? "Verifikasi" : "Penolakan"
    let historyNote = note || (decision === "VERIFIED"
        ? "Sertifikat telah diverifikasi oleh admin."
        : "Sertifikat ditolak karena ketidaksesuaian data.")

    if (isTransfer && decision === "VERIFIED") {
        const recipient = existing.transferToEmail
            ? await prisma.user.findUnique({ where: { email: existing.transferToEmail } })
            : null
        if (!recipient) return fail("User tujuan transfer tidak ditemukan")
        Object.assign(data, { status: "VERIFIED", ownerId: recipient.id, transferToEmail: null, verifiedBy: admin.id, verifiedAt: now })
        action = "Pengalihan Hak"
        historyNote = note || `Persetujuan pengalihan hak kepemilikan kepada ${recipient.email}.`
    } else if (isTransfer) {
        Object.assign(data, { status: "VERIFIED", transferToEmail: null })
        action = "Pembatalan Transfer"
        historyNote = note || "Permohonan pengalihan hak ditolak oleh admin."
    } else if (decision === "VERIFIED") {
        Object.assign(data, { status: "VERIFIED", verifiedBy: admin.id, verifiedAt: now })
    } else {
        Object.assign(data, {
            status: "REJECTED",
            rejectedBy: admin.id,
            rejectedAt: now,
            rejectionReason: note || "Sertifikat ditolak karena ketidaksesuaian data.",
        })
    }

    return prisma.$transaction(async (tx) => {
        // Guard against a concurrent change between our read and this write
        const { count } = await tx.certificate.updateMany({
            where: { id: existing.id, status: existing.status as any },
            data,
        })
        if (count === 0) return fail("Status sertifikat sudah berubah, muat ulang halaman")

        // New owner needs a new seal: the old one names the previous owner
        if (isTransfer && decision === "VERIFIED") {
            await tx.steganographyMetadata.deleteMany({ where: { certificateId: existing.id } })
        }

        const owner = await tx.certificate.findUniqueOrThrow({
            where: { id: existing.id },
            select: { owner: { select: { name: true, email: true } } },
        })
        await tx.history.create({
            data: {
                certificateId: existing.id,
                actor_name: admin.name || "Admin",
                actor_email: admin.email,
                action,
                note: historyNote,
                owner_name: owner.owner.name,
                owner_email: owner.owner.email,
            },
        })
        return { success: true as const }
    })
}

/** Builds the encrypted payload, hides it in the certificate image and records the seal. */
async function issueSealIfMissing(admin: Actor, certId: string, storage: CertificateStorage) {
    const cert = await prisma.certificate.findUniqueOrThrow({
        where: { id: certId },
        include: {
            owner: { select: { name: true } },
            history: { orderBy: { createdAt: "asc" }, select: { action: true, owner_name: true, createdAt: true } },
            steganographyMetadata: { select: { id: true }, take: 1 },
        },
    })
    if (cert.steganographyMetadata.length > 0 || !cert.image_url) return { success: true as const }

    try {
        const source = resolveImageSource(cert.image_url)
        if (!source) throw new Error("Lokasi gambar sertifikat tidak dikenali atau tidak diizinkan")
        const cover = await readImage(storage, source)

        // Key order is part of the hash contract (see payload.ts)
        const payload: CertificatePayload = {
            certId: cert.id,
            ownerId: cert.ownerId,
            ownerName: cert.owner.name,
            verifiedAt: (cert.verifiedAt ?? new Date()).toISOString(),
            validator: admin.name || "Admin",
            serial: cert.nomor_sertifikat,
            transactionType: cert.transferReason || "Initial Registration",
            history: cert.history.map((h) => ({ a: h.action, o: h.owner_name, d: h.createdAt.toISOString() })),
        }

        const stego = await Steganography.embed(cover, sealPayload(payload))
        const objectPath = `verified/verified_${Date.now()}_${cert.nomor_sertifikat.replace(/[^a-z0-9]/gi, "_")}.png`
        const publicUrl = await storage.uploadVerified(objectPath, stego)

        await prisma.$transaction([
            prisma.steganographyMetadata.create({
                data: {
                    certificateId: cert.id,
                    originalImage: cert.image_url,
                    stegoImage: publicUrl,
                    algorithm: "LSB (RGB)",
                    encryptionAlgo: "AES-256-GCM",
                    encryptionKey: "PROTECTED",
                    hashValue: hashPayload(payload),
                    createdBy: admin.id,
                    lastVerified: new Date(),
                },
            }),
            prisma.certificate.update({
                where: { id: cert.id },
                data: { image_url: publicUrl, stegoImageUrl: publicUrl },
            }),
        ])

        if (source.kind === "bucket" && source.bucket === PENDING_BUCKET) {
            await storage.removePending(source.path).catch(() => {})
        }
        return { success: true as const }
    } catch (error) {
        console.error("[STEGO] Embedding failed:", error)
        // Status is already VERIFIED; re-approving retries the seal
        return fail("Gagal menyisipkan steganografi: " + (error as Error).message)
    }
}

async function notifyAndAudit(admin: Actor, certId: string, decision: ReviewDecision, note: string | undefined) {
    const cert = await prisma.certificate.findUniqueOrThrow({ where: { id: certId } })
    await prisma.notification.create({
        data: {
            userId: cert.ownerId,
            certificateId: certId,
            title: decision === "VERIFIED" ? "Sertifikat Diverifikasi" : "Sertifikat Ditolak",
            message: decision === "VERIFIED"
                ? `Sertifikat ${cert.nama_lahan} (${cert.nomor_sertifikat}) telah diverifikasi oleh admin.`
                : `Sertifikat ${cert.nama_lahan} (${cert.nomor_sertifikat}) ditolak. Alasan: ${note || "Ketidaksesuaian data"}`,
            type: decision === "VERIFIED" ? "CERTIFICATE_VERIFIED" : "CERTIFICATE_REJECTED",
        },
    })

    try {
        await prisma.adminAuditLog.create({
            data: {
                adminId: admin.id,
                action: decision === "VERIFIED" ? "APPROVE_CERT" : "REJECT_CERT",
                targetType: "Certificate",
                targetId: certId,
                details: { certificateNumber: cert.nomor_sertifikat, action: decision.toLowerCase(), note: note || "" },
            },
        })
    } catch (auditError) {
        console.warn("[AUDIT] Failed to create audit log (non-fatal):", auditError)
    }
}

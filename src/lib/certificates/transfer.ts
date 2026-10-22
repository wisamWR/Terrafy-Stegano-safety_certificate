import prisma from "@/lib/prisma"
import { type Actor, fail } from "./common"

const NOT_AWAITING = "Permohonan transfer ini tidak lagi menunggu konfirmasi Anda"

/** Owner asks to hand a VERIFIED certificate to another registered user; recipient must confirm first. */
export async function requestTransfer(actor: Actor, certId: string, targetEmail: string, reason: string) {
    const email = targetEmail.trim()
    if (!email) return fail("Email tujuan wajib diisi")

    const cert = await prisma.certificate.findUnique({ where: { id: certId } })
    if (!cert) return fail("Sertifikat tidak ditemukan")
    if (cert.ownerId !== actor.id) return fail("Hanya pemilik sertifikat yang dapat melakukan transfer")
    if (cert.status !== "VERIFIED") return fail("Hanya sertifikat yang sudah terverifikasi yang dapat ditransfer")
    if (email.toLowerCase() === actor.email.toLowerCase()) return fail("Anda tidak dapat mengirim sertifikat ke diri sendiri")

    const target = await prisma.user.findUnique({ where: { email } })
    if (!target) return fail("Email tujuan tidak terdaftar di sistem")

    return prisma.$transaction(async (tx) => {
        // Conditional on status so two concurrent requests cannot both succeed
        const { count } = await tx.certificate.updateMany({
            where: { id: certId, ownerId: actor.id, status: "VERIFIED" },
            data: { status: "AWAITING_RECIPIENT", transferToEmail: target.email, transferReason: reason },
        })
        if (count === 0) return fail("Status sertifikat sudah berubah, muat ulang halaman")

        await tx.notification.create({
            data: {
                userId: target.id,
                certificateId: certId,
                title: "Permohonan Pengalihan Aset",
                message: `${actor.name} ingin mengalihkan sertifikat ${cert.nama_lahan} kepada Anda. Mohon konfirmasi.`,
                type: "TRANSFER_REQUEST",
            },
        })
        return { success: true as const }
    })
}

/** Recipient agrees; the request then waits for admin approval. */
export async function acceptTransfer(actor: Actor, certId: string) {
    const cert = await prisma.certificate.findUnique({ where: { id: certId }, select: { transferToEmail: true } })
    if (!cert) return fail("Sertifikat tidak ditemukan")
    if (cert.transferToEmail !== actor.email) return fail("Anda bukan penerima yang ditujukan untuk sertifikat ini")

    return prisma.$transaction(async (tx) => {
        const { count } = await tx.certificate.updateMany({
            where: { id: certId, status: "AWAITING_RECIPIENT", transferToEmail: actor.email },
            data: { status: "TRANSFER_PENDING" },
        })
        if (count === 0) return fail(NOT_AWAITING)

        await tx.history.create({
            data: {
                certificateId: certId,
                actor_name: actor.name || "Penerima",
                actor_email: actor.email,
                action: "Konfirmasi Penerima",
                note: "Penerima menyetujui permohonan pengalihan. Menunggu verifikasi admin.",
                owner_name: actor.name,
                owner_email: actor.email,
            },
        })
        return { success: true as const }
    })
}

/** Recipient declines; the certificate goes back to its owner as VERIFIED. */
export async function rejectTransfer(actor: Actor, certId: string) {
    return prisma.$transaction(async (tx) => {
        const { count } = await tx.certificate.updateMany({
            where: { id: certId, status: "AWAITING_RECIPIENT", transferToEmail: actor.email },
            data: { status: "VERIFIED", transferToEmail: null },
        })
        if (count === 0) return fail(NOT_AWAITING)

        const cert = await tx.certificate.findUniqueOrThrow({ where: { id: certId }, select: { ownerId: true, nama_lahan: true } })

        await tx.history.create({
            data: {
                certificateId: certId,
                actor_name: actor.name || "Penerima",
                actor_email: actor.email,
                action: "Penolakan Transfer",
                note: "Penerima menolak permohonan pengalihan aset.",
                owner_name: actor.name,
                owner_email: actor.email,
            },
        })

        // Recipient's request notification becomes a closed "rejected" entry without a link
        await tx.notification.updateMany({
            where: { userId: actor.id, certificateId: certId, type: "TRANSFER_REQUEST" },
            data: {
                title: "Transfer Ditolak",
                message: "Anda telah menolak permintaan transfer sertifikat ini.",
                type: "CERTIFICATE_REJECTED",
                certificateId: null,
            },
        })

        await tx.notification.create({
            data: {
                userId: cert.ownerId,
                certificateId: certId,
                title: "Transfer Ditolak Penerima",
                message: `${actor.name} menolak permintaan pengalihan sertifikat ${cert.nama_lahan}.`,
                type: "CERTIFICATE_REJECTED",
            },
        })
        return { success: true as const }
    })
}

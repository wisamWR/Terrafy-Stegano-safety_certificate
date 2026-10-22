import { randomBytes } from "crypto"
import prisma from "@/lib/prisma"
import { type Actor, type CertificateInput, fail, validateCertificateImage } from "./common"
import { PENDING_PREFIX, type CertificateStorage } from "./storage"

function requiredFieldError(input: CertificateInput): string | null {
    const missing = (["nomorSertifikat", "namaSertifikat", "luasTanah", "alamat"] as const).filter((k) => !input[k]?.trim())
    return missing.length ? `Kolom wajib belum diisi: ${missing.join(", ")}` : null
}

async function hasVerifiedDuplicate(nomor: string, excludeId?: string) {
    const existing = await prisma.certificate.findFirst({
        where: { nomor_sertifikat: nomor, status: "VERIFIED", ...(excludeId ? { id: { not: excludeId } } : {}) },
        select: { id: true },
    })
    return !!existing
}

/** Stores a validated PNG in the private pending bucket and returns the image_url to persist. */
async function storePending(storage: CertificateStorage, file: NonNullable<CertificateInput["file"]>) {
    const safeName = file.name.replace(/[^a-z0-9.]/gi, "_").toLowerCase()
    const filename = `pending_${Date.now()}_${randomBytes(4).toString("hex")}_${safeName}`
    await storage.uploadPending(filename, file.buffer, "image/png")
    return { filename, imageUrl: `${PENDING_PREFIX}${filename}` }
}

const DUPLICATE = () => fail("DUPLICATE_NUMBER", { message: "Nomor sertifikat ini sudah terdaftar dan TERVERIFIKASI milik orang lain." })

export async function createCertificate(actor: Actor, input: CertificateInput, storage: CertificateStorage) {
    const missing = requiredFieldError(input)
    if (missing) return fail(missing)

    const nomor = input.nomorSertifikat.trim()

    // Only a VERIFIED certificate blocks a number; several PENDING claims may coexist (disputes)
    if (await hasVerifiedDuplicate(nomor)) return DUPLICATE()

    let uploaded: { filename: string; imageUrl: string } | null = null
    if (input.file && input.file.buffer.length > 0) {
        const invalid = validateCertificateImage(input.file)
        if (invalid) return fail(invalid)
        uploaded = await storePending(storage, input.file)
    }

    try {
        const certificate = await prisma.$transaction(async (tx) => {
            const cert = await tx.certificate.create({
                data: {
                    nomor_sertifikat: nomor,
                    nama_lahan: input.namaSertifikat,
                    luas_tanah: `${input.luasTanah} m2`,
                    lokasi: input.alamat,
                    keterangan: input.keterangan || null,
                    transferReason: input.asalHak || null,
                    image_url: uploaded?.imageUrl ?? null,
                    ownerId: actor.id,
                    status: "PENDING",
                },
            })
            await tx.notification.create({
                data: {
                    userId: actor.id,
                    certificateId: cert.id,
                    title: "Sertifikat Menunggu Verifikasi",
                    message: `Sertifikat ${input.namaSertifikat} (${nomor}) sedang dalam proses verifikasi.`,
                    type: "CERTIFICATE_PENDING",
                },
            })
            await tx.history.create({
                data: {
                    certificateId: cert.id,
                    actor_name: actor.name || "User",
                    actor_email: actor.email,
                    action: "Pendaftaran",
                    note: "Pengajuan pendaftaran aset baru.",
                    owner_name: actor.name || "User",
                    owner_email: actor.email,
                },
            })
            return cert
        })
        return { success: true as const, certificate }
    } catch (error) {
        // Do not leave an orphaned private upload behind
        if (uploaded) await storage.removePending(uploaded.filename).catch(() => {})
        throw error
    }
}

export async function updateCertificate(actor: Actor, certId: string, input: CertificateInput, storage: CertificateStorage) {
    const existing = await prisma.certificate.findUnique({ where: { id: certId } })
    if (!existing) return fail("Sertifikat tidak ditemukan")
    if (existing.ownerId !== actor.id) return fail("Anda tidak memiliki izin mengedit sertifikat ini")
    if (existing.status !== "PENDING") return fail("Hanya sertifikat berstatus PENDING yang dapat diedit")

    const missing = requiredFieldError(input)
    if (missing) return fail(missing)

    const nomor = input.nomorSertifikat.trim()
    if (await hasVerifiedDuplicate(nomor, certId)) return DUPLICATE()

    // New image goes to the private bucket like on create (it used to land in public/, readable by anyone)
    let uploaded: { filename: string; imageUrl: string } | null = null
    if (input.file && input.file.buffer.length > 0) {
        const invalid = validateCertificateImage(input.file)
        if (invalid) return fail(invalid)
        uploaded = await storePending(storage, input.file)
    }

    try {
        const certificate = await prisma.$transaction(async (tx) => {
            const updated = await tx.certificate.update({
                where: { id: certId },
                data: {
                    nomor_sertifikat: nomor,
                    nama_lahan: input.namaSertifikat,
                    luas_tanah: input.luasTanah,
                    lokasi: input.alamat,
                    keterangan: input.keterangan || null,
                    transferReason: input.asalHak || null,
                    ...(uploaded ? { image_url: uploaded.imageUrl } : {}),
                },
            })
            await tx.history.create({
                data: {
                    certificateId: certId,
                    action: "UPDATE",
                    actor_name: actor.name || "User",
                    actor_email: actor.email,
                    note: "Sertifikat diperbarui oleh pemilik",
                    owner_name: actor.name || "User",
                    owner_email: actor.email,
                },
            })
            return updated
        })

        if (uploaded && existing.image_url?.startsWith(PENDING_PREFIX)) {
            await storage.removePending(existing.image_url.slice(PENDING_PREFIX.length)).catch(() => {})
        }
        return { success: true as const, certificate }
    } catch (error) {
        if (uploaded) await storage.removePending(uploaded.filename).catch(() => {})
        throw error
    }
}

export async function deleteCertificate(actor: Actor, certId: string, storage: CertificateStorage) {
    const cert = await prisma.certificate.findUnique({ where: { id: certId } })
    if (!cert) return fail("Sertifikat tidak ditemukan")
    if (cert.ownerId !== actor.id) return fail("Anda tidak memiliki akses untuk menghapus sertifikat ini")
    if (cert.status !== "REJECTED" && cert.status !== "PENDING") {
        return fail("Hanya sertifikat yang ditolak atau pending yang dapat dihapus")
    }

    // History, metadata and notifications cascade in the schema
    await prisma.certificate.delete({ where: { id: certId } })

    if (cert.image_url?.startsWith(PENDING_PREFIX)) {
        await storage.removePending(cert.image_url.slice(PENDING_PREFIX.length)).catch(() => {})
    }
    return { success: true as const }
}

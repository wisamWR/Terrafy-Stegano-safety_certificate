import prisma from "@/lib/prisma"
import { type Actor, fail, isAdmin, notArchived } from "./common"
import { PENDING_PREFIX, type CertificateStorage } from "./storage"

export async function listUserCertificates(actor: Actor) {
    const certificates = await prisma.certificate.findMany({
        where: { ownerId: actor.id, ...notArchived },
        orderBy: { createdAt: "desc" },
    })
    return { success: true as const, certificates }
}

/** Owner, admin, or the user a pending transfer is addressed to may view a certificate. */
export function canViewCertificate(actor: Actor, cert: { ownerId: string; transferToEmail: string | null }) {
    return isAdmin(actor) || cert.ownerId === actor.id || (!!cert.transferToEmail && cert.transferToEmail === actor.email)
}

export async function getCertificateDetail(actor: Actor, id: string, storage: CertificateStorage) {
    const cert = await prisma.certificate.findUnique({
        where: { id },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            history: { orderBy: { createdAt: "desc" } },
            steganographyMetadata: { take: 1 },
        },
    })
    if (!cert) return fail("Sertifikat tidak ditemukan")
    if (!canViewCertificate(actor, cert)) return fail("Anda tidak memiliki akses ke sertifikat ini")

    const conflicts = await prisma.certificate.findMany({
        where: { nomor_sertifikat: cert.nomor_sertifikat, id: { not: id } },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, createdAt: true, owner: { select: { name: true } } },
    })

    // Pending images live in a private bucket: hand out a short-lived signed URL to owner/admin only
    let imageUrl = cert.image_url
    if (imageUrl?.startsWith(PENDING_PREFIX)) {
        imageUrl = isAdmin(actor) || cert.ownerId === actor.id
            ? (await storage.signPendingUrl(imageUrl.slice(PENDING_PREFIX.length), 3600)) ?? imageUrl
            : "/placeholder_secure.png"
    }

    const { steganographyMetadata, ...rest } = cert
    return {
        success: true as const,
        certificate: {
            ...rest,
            image_url: imageUrl,
            ownerName: cert.owner.name,
            ownerEmail: cert.owner.email,
            steganographyMetadata: steganographyMetadata[0] ?? null,
            // UI reads conflicts as { created_at, ownerName }
            conflicts: conflicts.map((c) => ({ id: c.id, status: c.status, created_at: c.createdAt, ownerName: c.owner.name })),
        },
    }
}

export async function listAllCertificates() {
    const [certs, duplicates] = await Promise.all([
        prisma.certificate.findMany({
            where: notArchived,
            orderBy: { createdAt: "desc" },
            include: { owner: { select: { id: true, name: true, email: true } } },
        }),
        prisma.certificate.groupBy({
            by: ["nomor_sertifikat"],
            _count: { _all: true },
            having: { nomor_sertifikat: { _count: { gt: 1 } } },
        }),
    ])

    const duplicateCount = new Map(duplicates.map((d) => [d.nomor_sertifikat, d._count._all]))

    const certificates = certs.map((c) => ({
        ...c,
        ownerName: c.owner.name,
        ownerEmail: c.owner.email,
        duplicateCount: duplicateCount.get(c.nomor_sertifikat) ?? 0,
        owner: { id: c.owner.id, name: c.owner.name || c.owner.email || "User", email: c.owner.email },
    }))
    return { success: true as const, certificates }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"]

export async function getAdminStats(now = new Date()) {
    const year = now.getFullYear()
    const [byStatus, totalUsers, thisYear, approvedTransfers] = await Promise.all([
        prisma.certificate.groupBy({ by: ["status"], where: notArchived, _count: { _all: true } }),
        prisma.user.count({ where: { role: "USER" } }),
        prisma.certificate.findMany({
            where: { ...notArchived, createdAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
            select: { createdAt: true },
        }),
        prisma.history.count({ where: { action: "Pengalihan Hak" } }),
    ])

    const count = (status: string) => byStatus.find((s) => s.status === status)?._count._all ?? 0
    const verified = count("VERIFIED")
    const pending = count("PENDING")
    const rejected = count("REJECTED")
    const transfer = count("TRANSFER_PENDING") + count("AWAITING_RECIPIENT")
    const total = byStatus.reduce((sum, s) => sum + s._count._all, 0)

    return {
        success: true as const,
        stats: { total, pending, verified, rejected, transfer, approvedTransfers, users: totalUsers },
        statusData: [
            { name: "approved", value: verified, fill: "var(--color-approved)" },
            { name: "pending", value: pending, fill: "var(--color-pending)" },
            { name: "rejected", value: rejected, fill: "var(--color-rejected)" },
            { name: "transfer", value: transfer, fill: "var(--color-transfer)" },
        ],
        monthlyTrend: MONTHS.map((name, month) => ({
            name,
            total: thisYear.filter((c) => c.createdAt.getMonth() === month).length,
        })),
    }
}

export async function listAdminHistory() {
    const rows = await prisma.history.findMany({
        where: { certificate: notArchived },
        orderBy: { createdAt: "desc" },
        include: {
            certificate: {
                select: {
                    id: true, nomor_sertifikat: true, nama_lahan: true, status: true,
                    owner: { select: { name: true, email: true } },
                },
            },
        },
    })

    const history = rows.map((h) => {
        const creatorName = h.certificate.owner.name || "Unknown"
        const creatorEmail = h.certificate.owner.email || "Unknown"
        return {
            ...h,
            certificate_id: h.certificateId,
            certNo: h.certificate.nomor_sertifikat,
            nama_lahan: h.certificate.nama_lahan,
            certStatus: h.certificate.status,
            creatorName,
            creatorEmail,
            owner_name: h.owner_name || creatorName,
            owner_email: h.owner_email || creatorEmail,
            certificate: { ...h.certificate, owner: { name: creatorName, email: creatorEmail } },
        }
    })
    return { success: true as const, history }
}

export async function getHistoryDetail(historyId: string) {
    const history = await prisma.history.findUnique({
        where: { id: historyId },
        include: { certificate: { include: { owner: true, history: { orderBy: { createdAt: "desc" } } } } },
    })
    if (!history) return fail("Catatan riwayat tidak ditemukan")

    // Never ship the owner's password hash to the browser
    const { password: _password, ...owner } = history.certificate.owner
    return { success: true as const, history: { ...history, certificate: { ...history.certificate, owner } } }
}

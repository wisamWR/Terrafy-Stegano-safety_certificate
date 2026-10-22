import prisma from "@/lib/prisma"
import { type Actor, notArchived } from "./common"

export async function listNotifications(actor: Actor) {
    const rows = await prisma.notification.findMany({
        where: {
            userId: actor.id,
            OR: [{ certificateId: null }, { certificate: notArchived }],
        },
        orderBy: { createdAt: "desc" },
        include: { certificate: { select: { nama_lahan: true, nomor_sertifikat: true } } },
    })

    const notifications = rows.map(({ certificate, ...n }) => ({
        ...n,
        certName: certificate?.nama_lahan ?? null,
        certNo: certificate?.nomor_sertifikat ?? null,
    }))
    return { success: true as const, notifications }
}

/** Scoped to the actor: marking someone else's notification is a silent no-op. */
export async function markNotificationRead(actor: Actor, notificationId: string) {
    const result = await prisma.notification.updateMany({
        where: { id: notificationId, userId: actor.id },
        data: { isRead: true },
    })
    return { success: true as const, updated: result.count }
}

export async function markAllNotificationsRead(actor: Actor) {
    await prisma.notification.updateMany({
        where: { userId: actor.id, isRead: false },
        data: { isRead: true },
    })
    return { success: true as const }
}

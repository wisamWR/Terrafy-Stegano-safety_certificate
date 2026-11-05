"use server"

// Thin server-action layer: authenticate, parse input, delegate to src/lib/certificates/*,
// revalidate pages. Business rules live in the service modules so they can be tested directly.

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { allowRequest } from "@/lib/rate-limit"
import { type AuthUser, getAdminUser, getAuthUser } from "@/lib/auth-guard"
import { type ActionResult, type CertificateInput, type UploadedFile, MAX_CERTIFICATE_BYTES, fail } from "@/lib/certificates/common"
import { supabaseStorage } from "@/lib/certificates/storage"
import * as queries from "@/lib/certificates/queries"
import * as registration from "@/lib/certificates/registration"
import * as transfer from "@/lib/certificates/transfer"
import * as notifications from "@/lib/certificates/notifications"
import { reviewCertificate } from "@/lib/certificates/approval"
import * as reissue from "@/lib/certificates/reissue"
import { verifyCertificateImage as verifyImage } from "@/lib/certificates/verification"

async function readFile(formData: FormData, field = "file"): Promise<UploadedFile | null> {
    const file = formData.get(field)
    if (!(file instanceof File) || file.size === 0) return null
    return { buffer: Buffer.from(await file.arrayBuffer()), type: file.type, name: file.name }
}

async function readCertificateInput(formData: FormData): Promise<CertificateInput> {
    const text = (key: string) => {
        const value = formData.get(key)
        return typeof value === "string" ? value : ""
    }
    return {
        nomorSertifikat: text("nomorSertifikat"),
        namaSertifikat: text("namaSertifikat"),
        luasTanah: text("luasTanah"),
        alamat: text("alamat"),
        keterangan: text("keterangan"),
        asalHak: text("asalHak"),
        file: await readFile(formData),
    }
}

type Success<T> = Extract<T, { success: true }>

/** Runs a service call and keeps the `{ error }` contract the UI expects when something throws. */
async function respond<T>(label: string, run: () => Promise<T>): Promise<ActionResult<Success<T>>> {
    try {
        return (await run()) as ActionResult<Success<T>>
    } catch (error: any) {
        console.error(`[${label}]`, error)
        if (error?.code === "P2002" || error?.code === "23505") return fail("DUPLICATE_NUMBER") as ActionResult<Success<T>>
        return fail(`${label}: ${error?.message ?? error}`) as ActionResult<Success<T>>
    }
}

/** Same as respond, for logged-in users only. */
function asUser<T>(label: string, run: (user: AuthUser) => Promise<T>) {
    return respond(label, async () => {
        const user = await getAuthUser()
        return user ? run(user) : fail("Silakan login terlebih dahulu")
    })
}

/** Same as respond, for admins only (role re-checked in the database). */
function asAdmin<T>(label: string, run: (admin: AuthUser) => Promise<T>) {
    return respond(label, async () => {
        const admin = await getAdminUser()
        return admin ? run(admin) : fail("Anda tidak memiliki akses admin. Silakan login ulang sebagai admin.")
    })
}

export async function getUserCertificates() {
    return asUser("Gagal mengambil data sertifikat", (user) => queries.listUserCertificates(user))
}

export async function createCertificate(formData: FormData) {
    const input = await readCertificateInput(formData)
    return asUser("Gagal menambahkan sertifikat", (user) => registration.createCertificate(user, input, supabaseStorage()))
}

export async function updateCertificate(certId: string, formData: FormData) {
    const input = await readCertificateInput(formData)
    const result = await asUser("Gagal mengupdate sertifikat", (user) => registration.updateCertificate(user, certId, input, supabaseStorage()))
    if (result.success) {
        revalidatePath(`/sertifikat/${certId}`)
        revalidatePath("/sertifikat")
        revalidatePath("/")
    }
    return result
}

export async function deleteCertificate(certId: string) {
    return asUser("Gagal menghapus sertifikat", (user) => registration.deleteCertificate(user, certId, supabaseStorage()))
}

export async function requestTransfer(certId: string, targetEmail: string, reason: string) {
    return asUser("Gagal memproses permohonan transfer", (user) => transfer.requestTransfer(user, certId, targetEmail, reason))
}

export async function acceptTransfer(certId: string) {
    return asUser("Gagal menyetujui transfer", (user) => transfer.acceptTransfer(user, certId))
}

export async function rejectTransfer(certId: string) {
    return asUser("Gagal menolak transfer", (user) => transfer.rejectTransfer(user, certId))
}

export async function getCertificateById(id: string) {
    return asUser("Gagal memuat sertifikat", (user) => queries.getCertificateDetail(user, id, supabaseStorage()))
}

export async function getAllCertificates() {
    return asAdmin("Gagal mengambil data", () => queries.listAllCertificates())
}

export async function getAdminStats() {
    return asAdmin("Gagal mengambil statistik", () => queries.getAdminStats())
}

export async function getAdminHistory() {
    return asAdmin("Gagal mengambil riwayat", () => queries.listAdminHistory())
}

export async function getHistoryDetail(historyId: string) {
    return asAdmin("Gagal mengambil detail riwayat", () => queries.getHistoryDetail(historyId))
}

export async function updateCertificateStatus(id: string, status: "VERIFIED" | "REJECTED", note?: string) {
    const result = await asAdmin("Gagal memperbarui status sertifikat", async (admin) => {
        if (status !== "VERIFIED" && status !== "REJECTED") return fail("Status tidak valid")
        return reviewCertificate(admin, id, status, note, supabaseStorage())
    })
    revalidatePath("/admin/persetujuan")
    revalidatePath("/admin/dashboard")
    revalidatePath(`/sertifikat/${id}`)
    return result
}

export async function reissueSeal(certId: string) {
    const result = await asAdmin("Gagal menerbitkan ulang segel", (admin) => reissue.reissueSeal(admin, certId, supabaseStorage()))
    revalidatePath(`/admin/persetujuan/${certId}`)
    revalidatePath(`/sertifikat/${certId}`)
    return result
}

export async function getUserNotifications() {
    return asUser("Gagal mengambil notifikasi", (user) => notifications.listNotifications(user))
}

export async function markNotificationAsRead(notificationId: string) {
    return asUser("Gagal menandai notifikasi", (user) => notifications.markNotificationRead(user, notificationId))
}

export async function markAllNotificationsAsRead() {
    return asUser("Gagal menandai semua notifikasi", (user) => notifications.markAllNotificationsRead(user))
}

/** Public: anyone may check an image, no login required. Rate limited per IP (20/min). */
export async function verifyCertificateImage(formData: FormData) {
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    // Check first so a blocked caller's upload is not copied or processed (Next has already parsed the body).
    const allowed = allowRequest(`verify|${ip}`, 20, 60_000)
    const file = allowed ? await readFile(formData) : null
    return respond("Terjadi kesalahan sistem saat verifikasi", async () => {
        if (!allowed) return fail("Terlalu banyak permintaan verifikasi. Coba lagi dalam 1 menit.", { code: "RATE_LIMITED" })
        if (!file) return fail("File tidak valid")
        if (file.buffer.length > MAX_CERTIFICATE_BYTES) return fail("Ukuran file terlalu besar (maks 10 MB)")
        return verifyImage(file.buffer, supabaseStorage())
    })
}

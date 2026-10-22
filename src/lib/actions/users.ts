"use server"

import prisma from "@/lib/prisma"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { revalidatePath } from "next/cache"
import { getAuthUser } from "@/lib/auth-guard"
import { SESSION_COOKIE, sessionCookieOptions, signSession, type SessionPayload } from "@/lib/session"

// Authenticated user (role/identity re-read from DB)
async function getCurrentUser() {
    return getAuthUser()
}

// Re-issue the signed session cookie after profile changes
async function updateSessionCookie(user: any) {
    const sessionData: SessionPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image
    }
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, await signSession(sessionData), sessionCookieOptions)
}

export async function updateProfile(prevState: any, formData: FormData) {
    const session = await getCurrentUser()
    if (!session) return { error: "Unauthorized" }

    const name = formData.get("name") as string
    const email = formData.get("email") as string

    if (!name || !email) {
        return { error: "Nama dan Email wajib diisi" }
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: session.id },
            data: { name, email }
        })

        await updateSessionCookie({ ...session, name, email })
        revalidatePath("/pengaturan")
        
        return { success: true, message: "Profil berhasil diperbarui" }
    } catch (error) {
        console.error("Update profile error:", error)
        return { error: "Gagal memperbarui profil" }
    }
}

export async function updateAvatar(prevState: any, formData: FormData) {
    const session = await getCurrentUser()
    if (!session) return { error: "Unauthorized" }

    const file = formData.get("avatar") as File
    
    if (!file || file.size === 0) {
        return { error: "Tidak ada file yang diunggah" }
    }

    try {
        // Only raster image types: files land in public/, so .html/.svg would be served as active content
        const ALLOWED_TYPES: Record<string, string> = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
        }
        const ext = ALLOWED_TYPES[file.type]
        if (!ext) return { error: "Format foto harus JPG, PNG, atau WebP" }
        if (file.size > 2 * 1024 * 1024) return { error: "Ukuran foto maksimal 2 MB" }

        // Upload Logic (Local Storage)
        const buffer = Buffer.from(await file.arrayBuffer())
        const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars")
        await mkdir(uploadDir, { recursive: true })

        const timestamp = Date.now()
        const filename = `avatar_${session.id}_${timestamp}.${ext}`
        const filePath = path.join(uploadDir, filename)

        await writeFile(filePath, buffer)
        const imageUrl = `/uploads/avatars/${filename}`

        // Update DB
        const updatedUser = await prisma.user.update({
            where: { id: session.id },
            data: { image: imageUrl } as any
        })

        await updateSessionCookie({ ...session, image: imageUrl })
        revalidatePath("/pengaturan")

        return { success: true, message: "Foto profil berhasil diperbarui", imageUrl }
    } catch (error) {
        console.error("Update avatar error:", error)
        return { error: "Gagal mengunggah foto" }
    }
}

export async function changePassword(prevState: any, formData: FormData) {
    const session = await getCurrentUser()
    if (!session) return { error: "Unauthorized" }

    const currentPassword = formData.get("currentPassword") as string
    const newPassword = formData.get("newPassword") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { error: "Semua kolom wajib diisi" }
    }

    if (newPassword !== confirmPassword) {
        return { error: "Konfirmasi kata sandi tidak cocok" }
    }

    try {
        const user = await prisma.user.findUnique({
             where: { id: session.id } 
        })

        if (!user) return { error: "User tidak ditemukan" }

        const isMatch = await bcrypt.compare(currentPassword, user.password)
        if (!isMatch) {
            return { error: "Kata sandi lama salah" }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
            where: { id: session.id },
            data: { password: hashedPassword }
        })

        return { success: true, message: "Kata sandi berhasil diubah" }
    } catch (error) {
        console.error("Change password error:", error)
        return { error: "Gagal mengubah kata sandi" }
    }
}

export async function deleteAccount(password: string) {
    const session = await getCurrentUser()
    if (!session) return { error: "Unauthorized" }

    if (!password) {
        return { error: "Kata sandi diperlukan untuk konfirmasi" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.id },
            include: { certificates: true }
        })

        if (!user) return { error: "User tidak ditemukan" }

        // 1. Verify Password
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return { error: "Kata sandi salah" }
        }

        // 2. Manual Cascade Delete (Transaction)
        await prisma.$transaction(async (tx) => {
            // A. Delete Notifications
            await tx.notification.deleteMany({
                where: { userId: session.id }
            })

            // B. Delete Certificates & Related Data
            // Note: History & Metadata cascading depends on Schema, but safe to be explicit
            const certificateIds = user.certificates.map(c => c.id)

            if (certificateIds.length > 0) {
                // Delete Histories for these certificates
                await tx.history.deleteMany({
                    where: { certificateId: { in: certificateIds } }
                })

                // Delete Stego Metadata
                await tx.steganographyMetadata.deleteMany({
                    where: { certificateId: { in: certificateIds } }
                })
                
                // Delete Notifications related to these certificates
                await tx.notification.deleteMany({
                    where: { certificateId: { in: certificateIds } }
                })

                // Delete Certificates
                await tx.certificate.deleteMany({
                    where: { ownerId: session.id }
                })
            }

            // C. Delete Admin Logs (if any)
            await tx.adminAuditLog.deleteMany({
                where: { adminId: session.id }
            })

            // D. Finally, Delete User
            await tx.user.delete({
                where: { id: session.id }
            })
        })
        
        // Clear session
        const cookieStore = await cookies()
        cookieStore.delete(SESSION_COOKIE)

        return { success: true }
    } catch (error) {
        console.error("Delete account error:", error)
        return { error: "Gagal menghapus akun: " + (error as Error).message }
    }
}

export async function checkUserByEmail(email: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { name: true, email: true } // Only select public info
        });

        if (user) {
            return { success: true, user };
        } else {
            return { success: false, error: "User not found" };
        }
    } catch (error) {
        console.error("Check user error:", error);
        return { error: "Gagal mengecek user" };
    }
}

"use server"

import prisma from "@/lib/prisma"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { revalidatePath } from "next/cache"

// Helper to get current user ID
async function getCurrentUser() {
    const cookieStore = await cookies()
    const sessionValue = cookieStore.get("user_session")?.value
    if (!sessionValue) return null
    try {
        return JSON.parse(sessionValue)
    } catch {
        return null
    }
}

// Helper to update session cookie
async function updateSessionCookie(user: any) {
    const sessionData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image
    }
    const cookieStore = await cookies()
    cookieStore.set("user_session", JSON.stringify(sessionData), {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week
    })
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
        // Upload Logic (Local Storage)
        const buffer = Buffer.from(await file.arrayBuffer())
        const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars")
        await mkdir(uploadDir, { recursive: true })

        const timestamp = Date.now()
        // Simple extension extraction
        const ext = file.name.split('.').pop() || 'jpg'
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

export async function deleteAccount() {
    const session = await getCurrentUser()
    if (!session) return { error: "Unauthorized" }

    try {
        await prisma.user.delete({
            where: { id: session.id }
        })
        
        // Clear session
        const cookieStore = await cookies()
        cookieStore.delete("user_session")

        return { success: true }
    } catch (error) {
        console.error("Delete account error:", error)
        return { error: "Gagal menghapus akun" }
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

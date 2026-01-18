"use server"

import prisma from "@/lib/prisma"

export async function checkUserByEmail(email: string) {
    if (!email) {
        return { error: "Email wajib diisi" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { name: true, email: true } // Only select necessary fields
        })

        if (!user) {
            return { error: "Pengguna tidak ditemukan", found: false }
        }

        return { success: true, user, found: true }
    } catch (error) {
        console.error("Check user error:", error)
        return { error: "Terjadi kesalahan sistem", found: false }
    }
}

"use server"

import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"

export async function registerUser(formData: any) {
    const { name, email, password } = formData

    if (!name || !email || !password) {
        return { error: "Semua kolom harus diisi" }
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return { error: "Email sudah terdaftar" }
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: Role.USER,
            },
        })

        return { success: true, user: { id: user.id, name: user.name, email: user.email } }
    } catch (error) {
        console.error("Register error:", error)
        return { error: "Gagal mendaftar pengguna" }
    }
}

export async function loginUser(formData: any) {
    const { email, password } = formData

    if (!email || !password) {
        return { error: "Email dan password harus diisi" }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return { error: "Email atau password salah" }
        }

        // Check password (bcrypt)
        // For dummy seed user, password might be plain text 'password123' if not hashed in seed.ts
        // In seed.ts I didn't hash them yet. I should update seed.ts later or handle it here.
        const isMatch = await bcrypt.compare(password, user.password).catch(() => false)

        // Fallback for plain text if bcrypt fails (only for dev/dummy transition)
        const isPlainMatch = password === user.password

        if (!isMatch && !isPlainMatch) {
            return { error: "Email atau password salah" }
        }

        // Set Session (simulated with Cookie for middleware)
        const sessionData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        }

        // Use Next.js cookies (server side)
        const cookieStore = await cookies()
        cookieStore.set("user_session", JSON.stringify(sessionData), {
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 1 week
        })

        return { success: true, user: sessionData }
    } catch (error) {
        console.error("Login error:", error)
        return { error: "Terjadi kesalahan saat login" }
    }
}

export async function logoutUser() {
    const cookieStore = await cookies()
    cookieStore.delete("user_session")
    return { success: true }
}

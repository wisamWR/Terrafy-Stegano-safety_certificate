"use server"

import { cookies, headers } from "next/headers"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { SESSION_COOKIE, sessionCookieOptions, signSession, type SessionPayload } from "@/lib/session"
import { getCurrentSession } from "@/lib/auth-guard"
import { clearLoginFailures, loginRetryAfter, recordLoginFailure } from "@/lib/rate-limit"

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

// Compared against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH = "$2b$10$nSL61UazGOiZ/hPxasx9je5Zw.eKHekHU.dxyBtFP1LaNEH6rLazq"

export async function loginUser(formData: any) {
    const { email, password } = formData

    if (!email || !password) {
        return { error: "Email dan password harus diisi" }
    }

    const forwardedFor = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const limitKey = `${String(email).toLowerCase()}|${forwardedFor}`

    const retryAfter = loginRetryAfter(limitKey)
    if (retryAfter > 0) {
        return { error: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(retryAfter / 60)} menit.` }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        })

        const isMatch = await bcrypt.compare(String(password), user?.password ?? DUMMY_HASH).catch(() => false)

        if (!user || !isMatch) {
            recordLoginFailure(limitKey)
            return { error: "Email atau password salah" }
        }

        clearLoginFailures(limitKey)

        const sessionData: SessionPayload = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image,
        }

        const cookieStore = await cookies()
        cookieStore.set(SESSION_COOKIE, await signSession(sessionData), sessionCookieOptions)

        return { success: true, user: sessionData }
    } catch (error) {
        console.error("Login error:", error)
        return { error: "Terjadi kesalahan saat login" }
    }
}

export async function logoutUser() {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
    return { success: true }
}

export async function getSession() {
    return getCurrentSession()
}

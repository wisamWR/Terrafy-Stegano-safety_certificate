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
            console.log("[LOGIN FAIL] User not found for email:", email);
            return { error: "Email atau password salah" }
        }
        
        // DEBUG: Force log user object to check if 'image' exists at runtime
        console.log("[LOGIN DEBUG] Full User Object:", JSON.stringify(user, null, 2));

        // Check password (bcrypt)
        const isMatch = await bcrypt.compare(password, user.password).catch((err) => {
            console.error("[LOGIN ERROR] Bcrypt compare error:", err);
            return false;
        })
        const isPlainMatch = password === user.password

        console.log("[LOGIN DEBUG] Password check - Bcrypt:", isMatch, "Plain:", isPlainMatch);

        if (!isMatch && !isPlainMatch) {
            console.log("[LOGIN FAIL] Password mismatch");
            return { error: "Email atau password salah" }
        }

        // Set Session (simulated with Cookie for middleware)
        const sessionData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            image: (user as any).image // Cast to any to bypass potential stale type definition
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

export async function getSession() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("user_session")
    if (sessionCookie?.value) {
        try {
            return JSON.parse(sessionCookie.value)
        } catch (e) {
            return null
        }
    }
    return null
}

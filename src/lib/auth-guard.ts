import { cookies } from "next/headers"
import prisma from "@/lib/prisma"
import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/lib/session"

/**
 * Verified session straight from the signed cookie (no DB hit).
 * Use for display only; use getAuthUser/getAdminUser for authorization.
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies()
    return verifySession(cookieStore.get(SESSION_COOKIE)?.value)
}

export type AuthUser = {
    id: string
    name: string | null
    email: string
    role: "USER" | "ADMIN" | "DINAS"
    image: string | null
}

/**
 * Authenticated user, with role and identity re-read from the database so a
 * stale or demoted session can never keep elevated access. Null if not logged in.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
    const session = await getCurrentSession()
    if (!session) return null

    const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: { id: true, name: true, email: true, role: true, image: true },
    })
    return user
}

/** Authenticated user only if their role in the database is ADMIN. */
export async function getAdminUser(): Promise<AuthUser | null> {
    const user = await getAuthUser()
    return user && user.role === "ADMIN" ? user : null
}

import { SignJWT, jwtVerify } from "jose"

// Edge-safe (used by middleware) - do not import Node-only modules here.

export const SESSION_COOKIE = "user_session"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 1 week

export type SessionPayload = {
    id: string
    name: string | null
    email: string
    role: "USER" | "ADMIN" | "DINAS"
    image?: string | null
}

function getSecret(): Uint8Array {
    const secret = process.env.SESSION_SECRET
    if (!secret || secret.length < 32) {
        throw new Error(
            "SESSION_SECRET belum diatur atau kurang dari 32 karakter. Generate dengan: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        )
    }
    return new TextEncoder().encode(secret)
}

export const sessionCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
}

export async function signSession(payload: SessionPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(payload.id)
        .setIssuedAt()
        .setExpirationTime(`${SESSION_MAX_AGE}s`)
        .sign(getSecret())
}

/** Returns the session payload, or null if the token is missing, forged or expired. */
export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
    if (!token) return null
    try {
        const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] })
        if (typeof payload.id !== "string" || typeof payload.email !== "string") return null
        return {
            id: payload.id,
            name: (payload.name as string | null) ?? null,
            email: payload.email,
            role: payload.role as SessionPayload["role"],
            image: (payload.image as string | null | undefined) ?? null,
        }
    } catch {
        return null
    }
}

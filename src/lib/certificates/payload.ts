import * as crypto from "crypto"
import { getEncryptionKey, getLegacyDecryptionKeys } from "@/lib/crypto-key"

/** Data sealed inside a verified certificate image. Field order matters: the stored hash is over JSON.stringify. */
export type CertificatePayload = {
    certId: string
    ownerId: string
    ownerName: string | null
    verifiedAt: string
    validator: string
    serial: string
    transactionType: string
    history: { a: string; o: string | null; d: string }[]
}

export function hashPayload(payload: unknown): string {
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex")
}

/** AES-256-GCM, serialized as `ivHex:authTagHex:ciphertextHex`. */
export function sealPayload(payload: CertificatePayload, key: Buffer = getEncryptionKey()): string {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
    const encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex") + cipher.final("hex")
    return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${encrypted}`
}

/**
 * Decrypts and authenticates a sealed payload. Returns null if it is not in the sealed format,
 * was produced with another key, or was altered (GCM tag mismatch). Plain JSON is never accepted.
 */
export function openPayload(sealed: string, keys: Buffer[] = [getEncryptionKey(), ...getLegacyDecryptionKeys()]): Record<string, any> | null {
    const parts = sealed.split(":")
    if (parts.length !== 3) return null
    const [ivHex, tagHex, encryptedHex] = parts
    if (!/^[0-9a-f]{24}$/i.test(ivHex) || !/^[0-9a-f]{32}$/i.test(tagHex) || !/^[0-9a-f]*$/i.test(encryptedHex)) return null

    for (const key of keys) {
        try {
            const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"))
            decipher.setAuthTag(Buffer.from(tagHex, "hex"))
            const json = decipher.update(encryptedHex, "hex", "utf8") + decipher.final("utf8")
            return JSON.parse(json)
        } catch {
            // wrong key or tampered: try the next key
        }
    }
    return null
}

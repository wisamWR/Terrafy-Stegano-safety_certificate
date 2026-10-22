// Single source of truth for the AES-256-GCM key that protects the payload hidden in certificates.

// Key that older builds silently used when ENCRYPTION_KEY was unset. It is public (it is in the repo),
// so it is only honoured for *decrypting* old images, and only when explicitly enabled.
const LEGACY_PUBLIC_KEY_HEX = "a".repeat(64)

function parseKey(hex: string | undefined, name: string): Buffer {
    if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
        throw new Error(`${name} harus berupa 64 karakter hex (32 byte). Generate dengan: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
    }
    return Buffer.from(hex, "hex")
}

/** Key used to encrypt new payloads and to decrypt current ones. Throws if not configured. */
export function getEncryptionKey(): Buffer {
    return parseKey(process.env.STEGANOGRAPHY_KEY ?? process.env.ENCRYPTION_KEY, "STEGANOGRAPHY_KEY")
}

/** Extra keys to try when decrypting, to read images embedded before the key fix. Empty unless opted in. */
export function getLegacyDecryptionKeys(): Buffer[] {
    if (process.env.ALLOW_LEGACY_STEGO_KEY !== "true") return []
    return [Buffer.from(LEGACY_PUBLIC_KEY_HEX, "hex")]
}

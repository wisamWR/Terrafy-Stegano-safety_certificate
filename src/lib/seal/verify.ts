import { etc, verifyAsync } from "@noble/ed25519"
import { buildSigningBytes, fromBase64Url, type SealEnvelope, type SealPublic } from "./envelope"
import { DEFAULT_KEYRING, type Keyring } from "./public-keys"

export type SealRejection = "unknown_kid" | "revoked_kid" | "bad_signature" | "verifier_unavailable"
export type SealVerdict = { valid: true; pub: SealPublic } | { valid: false; reason: SealRejection }

/** Checks the Ed25519 signature of a v2 envelope. Runs in the browser and on the server. Never throws.
 * `verifier_unavailable` means the environment or keyring is unusable (no WebCrypto, malformed key), not that the seal is forged. */
export async function verifySeal(envelope: SealEnvelope, keyring: Keyring = DEFAULT_KEYRING): Promise<SealVerdict> {
    const kid = envelope.pub.kid
    if (keyring.revokedKids.includes(kid)) return { valid: false, reason: "revoked_kid" }
    if (!Object.hasOwn(keyring.publicKeys, kid)) return { valid: false, reason: "unknown_kid" }

    const publicKeyHex = keyring.publicKeys[kid]
    // A malformed keyring entry is a deployment error, not a forged seal
    if (!/^[0-9a-f]{64}$/.test(publicKeyHex)) return { valid: false, reason: "verifier_unavailable" }
    // noble needs WebCrypto SHA-512, only available in secure contexts (https, localhost)
    if (!globalThis.crypto?.subtle) return { valid: false, reason: "verifier_unavailable" }

    try {
        const ok = await verifyAsync(
            fromBase64Url(envelope.sig),
            buildSigningBytes(envelope.pub, envelope.enc),
            etc.hexToBytes(publicKeyHex),
            { zip215: false }, // strict RFC 8032 + rejects small-order keys; the ZIP-215 default would accept forgeries against torsion keys such as an all-zero key
        )
        return ok ? { valid: true, pub: envelope.pub } : { valid: false, reason: "bad_signature" }
    } catch {
        return { valid: false, reason: "bad_signature" }
    }
}

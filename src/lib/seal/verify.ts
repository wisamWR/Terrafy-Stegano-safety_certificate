import { etc, verifyAsync } from "@noble/ed25519"
import { buildSigningBytes, fromBase64Url, type SealEnvelope, type SealPublic } from "./envelope"
import { DEFAULT_KEYRING, type Keyring } from "./public-keys"

export type SealRejection = "unknown_kid" | "revoked_kid" | "bad_signature"
export type SealVerdict = { valid: true; pub: SealPublic } | { valid: false; reason: SealRejection }

/** Checks the Ed25519 signature of a v2 envelope. Runs in the browser and on the server. Never throws. */
export async function verifySeal(envelope: SealEnvelope, keyring: Keyring = DEFAULT_KEYRING): Promise<SealVerdict> {
    const kid = envelope.pub.kid
    if (keyring.revokedKids.includes(kid)) return { valid: false, reason: "revoked_kid" }
    if (!Object.hasOwn(keyring.publicKeys, kid)) return { valid: false, reason: "unknown_kid" }

    try {
        const ok = await verifyAsync(
            fromBase64Url(envelope.sig),
            buildSigningBytes(envelope.pub, envelope.enc),
            etc.hexToBytes(keyring.publicKeys[kid]),
            { zip215: false }, // strict RFC 8032: reject non-canonical encodings
        )
        return ok ? { valid: true, pub: envelope.pub } : { valid: false, reason: "bad_signature" }
    } catch {
        return { valid: false, reason: "bad_signature" }
    }
}

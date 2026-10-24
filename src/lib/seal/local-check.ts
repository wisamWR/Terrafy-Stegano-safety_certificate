import { revealFromPngBytes } from "./browser-reveal"
import { parseEnvelope } from "./envelope"
import { DEFAULT_KEYRING, type Keyring } from "./public-keys"
import { verifySeal, type SealRejection } from "./verify"

export type LocalVerdict =
    | { state: "valid"; serial: string; issuedAt: string; kid: string; issuer: string }
    | { state: "invalid"; reason: Exclude<SealRejection, "verifier_unavailable"> | "malformed" }
    | { state: "legacy" }
    | { state: "none" }
    | { state: "unsupported" }
    | { state: "unavailable" }

/**
 * Offline authenticity check of a certificate image. Nothing leaves the device.
 * Returns a verdict for any input; only rejects on allocation failure (e.g. an extremely large image).
 */
export async function checkSealLocally(bytes: Uint8Array, keyring: Keyring = DEFAULT_KEYRING): Promise<LocalVerdict> {
    const revealed = revealFromPngBytes(bytes)
    if (revealed.kind !== "found") return { state: revealed.kind }

    const parsed = parseEnvelope(revealed.text)
    if (parsed.kind === "v1") return { state: "legacy" }
    if (parsed.kind === "invalid") return { state: "invalid", reason: "malformed" }

    const verdict = await verifySeal(parsed.envelope, keyring)
    if (!verdict.valid) {
        if (verdict.reason === "verifier_unavailable") return { state: "unavailable" }
        return { state: "invalid", reason: verdict.reason }
    }

    const { serial, verifiedAt, kid, issuer } = verdict.pub
    return { state: "valid", serial, issuedAt: verifiedAt, kid, issuer }
}

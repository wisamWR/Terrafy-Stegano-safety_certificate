// Seal v2 envelope (isomorphic, no I/O). Embedded via LSB as JSON:
//   { v: 2, pub: SealPublic, enc: "ivHex:tagHex:ciphertextHex", sig: base64url(Ed25519) }
// The signature covers SEAL_DOMAIN + canonicalJSON(pub) + enc, so the encrypted part is signed too.

export const SEAL_DOMAIN = "TERRAFY-SEAL-v2"

export type SealPublic = { certId: string; serial: string; verifiedAt: string; issuer: string; kid: string }
export type SealEnvelope = { v: 2; pub: SealPublic; enc: string; sig: string }
export type ParsedSeal =
    | { kind: "v2"; envelope: SealEnvelope }
    | { kind: "v1"; sealed: string }
    | { kind: "invalid"; reason: string }

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

/** JSON with object keys sorted recursively, no whitespace. */
export function canonicalJSON(value: Json): string {
    if (value === null || typeof value !== "object") return JSON.stringify(value)
    if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonicalJSON(value[k])}`).join(",")}}`
}

export function toBase64Url(bytes: Uint8Array): string {
    let binary = ""
    for (const b of bytes) binary += String.fromCharCode(b)
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/** Throws on invalid input; callers must validate first (parseEnvelope does). */
export function fromBase64Url(text: string): Uint8Array {
    const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4)
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

/** Copies exactly the five public fields; extra properties on the input are dropped. */
export function pickPublic(pub: SealPublic): SealPublic {
    return { certId: pub.certId, serial: pub.serial, verifiedAt: pub.verifiedAt, issuer: pub.issuer, kid: pub.kid }
}

export function buildSigningBytes(pub: SealPublic, enc: string): Uint8Array {
    return new TextEncoder().encode(`${SEAL_DOMAIN}\n${canonicalJSON(pickPublic(pub))}\n${enc}`)
}

export function serializeEnvelope(envelope: SealEnvelope): string {
    return JSON.stringify({ v: envelope.v, pub: pickPublic(envelope.pub), enc: envelope.enc, sig: envelope.sig })
}

// Legacy v1 sealed string (case-insensitive, as historically accepted)
const SEALED = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]*$/i
// v2 enc: lowercase only (Node emits lowercase), so one envelope has exactly one spelling
const V2_ENC = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]*$/
// Canonical base64url of exactly 64 bytes: the last char carries 2 data bits, its 4 low bits must be 0
const SIG_64_BYTES = /^[A-Za-z0-9_-]{85}[AQgw]$/
const ENVELOPE_KEYS = "enc,pub,sig,v"
const PUB_FIELDS = ["certId", "serial", "verifiedAt", "issuer", "kid"] as const

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x)

const invalid = (reason: string): ParsedSeal => ({ kind: "invalid", reason })

/** Classifies the string revealed from an image. Never throws. */
export function parseEnvelope(raw: string): ParsedSeal {
    if (SEALED.test(raw)) return { kind: "v1", sealed: raw }

    let data: unknown
    try {
        data = JSON.parse(raw)
    } catch {
        return invalid("not_json")
    }
    if (!isRecord(data) || data.v !== 2) return invalid("unsupported_version")
    if (Object.keys(data).sort().join(",") !== ENVELOPE_KEYS) return invalid("unexpected_field")

    const pub = data.pub
    if (!isRecord(pub)) return invalid("missing_pub")
    for (const field of PUB_FIELDS) {
        if (typeof pub[field] !== "string" || !pub[field]) return invalid(`missing_${field}`)
    }
    if (Object.keys(pub).length !== PUB_FIELDS.length) return invalid("unexpected_pub_field")
    if (typeof data.enc !== "string" || !V2_ENC.test(data.enc)) return invalid("bad_enc")
    if (typeof data.sig !== "string" || !SIG_64_BYTES.test(data.sig)) return invalid("bad_sig")

    return { kind: "v2", envelope: { v: 2, pub: pickPublic(pub as SealPublic), enc: data.enc, sig: data.sig } }
}

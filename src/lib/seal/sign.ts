import { createPrivateKey, createPublicKey, sign, type KeyObject } from "crypto"
import { buildSigningBytes, toBase64Url, type SealPublic } from "./envelope"
import { DEFAULT_KEYRING, type Keyring } from "./public-keys"

// Server only: holds the private key. Never import from client components.

// DER prefix of a PKCS#8 Ed25519 private key; followed by the 32-byte seed.
const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex")

export function signingKeyFromSeed(seedHex: string | undefined): KeyObject {
    if (!seedHex || !/^[0-9a-fA-F]{64}$/.test(seedHex)) {
        throw new Error("SEAL_SIGNING_KEY harus berupa 64 karakter hex (seed Ed25519). Generate dengan: npm run seal:keygen")
    }
    return createPrivateKey({
        key: Buffer.concat([PKCS8_ED25519_PREFIX, Buffer.from(seedHex, "hex")]),
        format: "der",
        type: "pkcs8",
    })
}

export function publicKeyHexOf(privateKey: KeyObject): string {
    const spki = createPublicKey(privateKey).export({ format: "der", type: "spki" })
    return spki.subarray(spki.length - 32).toString("hex")
}

/**
 * Checks that SEAL_SIGNING_KEY is usable for the keyring's active key: not revoked, valid seed,
 * and matching the published public key. Returns the key so callers do not parse it twice.
 */
function loadActiveSigningKey(keyring: Keyring): KeyObject {
    if (keyring.revokedKids.includes(keyring.activeKid)) throw new Error(`kid aktif "${keyring.activeKid}" telah dicabut; rotasi kunci dulu`)
    const key = signingKeyFromSeed(process.env.SEAL_SIGNING_KEY)
    const expected = Object.hasOwn(keyring.publicKeys, keyring.activeKid) ? keyring.publicKeys[keyring.activeKid] : undefined
    if (!expected || publicKeyHexOf(key) !== expected.toLowerCase()) {
        throw new Error(`SEAL_SIGNING_KEY tidak cocok dengan kunci publik "${keyring.activeKid}" di src/lib/seal/public-keys.ts`)
    }
    return key
}

/** Throws unless a seal could be signed right now. Use to fail before any state changes. */
export function assertSigningReady(keyring: Keyring = DEFAULT_KEYRING): void {
    loadActiveSigningKey(keyring)
}

/** Signs a v2 envelope with SEAL_SIGNING_KEY after checking it is the keyring's active key. */
export function signSeal(pub: SealPublic, enc: string, keyring: Keyring = DEFAULT_KEYRING): string {
    if (pub.kid !== keyring.activeKid) throw new Error(`kid "${pub.kid}" bukan kunci aktif (${keyring.activeKid})`)
    const key = loadActiveSigningKey(keyring)
    return toBase64Url(sign(null, buildSigningBytes(pub, enc), key))
}

import { after, describe, it } from "node:test"
import assert from "node:assert/strict"
import {
    buildSigningBytes, canonicalJSON, fromBase64Url, parseEnvelope, serializeEnvelope, toBase64Url,
    type SealPublic,
} from "../src/lib/seal/envelope"
import * as ed from "@noble/ed25519"
import { verifySeal } from "../src/lib/seal/verify"
import { DEFAULT_KEYRING, type Keyring } from "../src/lib/seal/public-keys"
import { randomBytes } from "node:crypto"
import { assertSigningReady, publicKeyHexOf, signSeal, signingKeyFromSeed } from "../src/lib/seal/sign"

const pub: SealPublic = { certId: "c1", serial: "SHM-001", verifiedAt: "2026-10-23T08:00:00.000Z", issuer: "Terrafy", kid: "test-1" }
const enc = "00112233445566778899aabb:00112233445566778899aabbccddeeff:abcdef"
const sig = toBase64Url(new Uint8Array(64).fill(7))

describe("canonicalJSON", () => {
    it("is independent of key order, recursively", () => {
        assert.equal(canonicalJSON({ b: 1, a: { d: [3, 1], c: "x" } }), canonicalJSON({ a: { c: "x", d: [3, 1] }, b: 1 }))
        assert.equal(canonicalJSON({ b: 1, a: { d: [3, 1], c: "x" } }), '{"a":{"c":"x","d":[3,1]},"b":1}')
    })

    it("keeps array order", () => {
        assert.notEqual(canonicalJSON([1, 2]), canonicalJSON([2, 1]))
    })
})

describe("base64url", () => {
    it("round-trips every padding length", () => {
        for (const n of [0, 1, 2, 3, 64]) {
            const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37) % 256)
            assert.deepEqual(fromBase64Url(toBase64Url(bytes)), bytes)
        }
        assert.equal(toBase64Url(new Uint8Array(64)).length, 86)
    })
})

describe("buildSigningBytes", () => {
    it("prefixes the domain and uses canonical pub", () => {
        const text = new TextDecoder().decode(buildSigningBytes(pub, enc))
        assert.ok(text.startsWith("TERRAFY-SEAL-v2\n"))
        const reordered = { kid: pub.kid, issuer: pub.issuer, verifiedAt: pub.verifiedAt, serial: pub.serial, certId: pub.certId }
        assert.deepEqual(buildSigningBytes(reordered, enc), buildSigningBytes(pub, enc))
    })

    it("is unambiguous and ignores extra fields", () => {
        const text = new TextDecoder().decode(buildSigningBytes({ ...pub, serial: "A\nB" }, enc))
        assert.equal(text.split("\n").length, 3)
        const extra = { ...pub, ownerName: "Alice" } as SealPublic
        assert.deepEqual(buildSigningBytes(extra, enc), buildSigningBytes(pub, enc))
        assert.ok(!serializeEnvelope({ v: 2, pub: extra, enc, sig }).includes("Alice"))
    })
})

describe("parseEnvelope", () => {
    it("parses a v2 envelope", () => {
        const parsed = parseEnvelope(serializeEnvelope({ v: 2, pub, enc, sig }))
        assert.equal(parsed.kind, "v2")
        if (parsed.kind === "v2") assert.deepEqual(parsed.envelope.pub, pub)
    })

    it("recognises a legacy v1 sealed string", () => {
        assert.deepEqual(parseEnvelope(enc), { kind: "v1", sealed: enc })
    })

    it("rejects plain JSON without v:2 (old forged payload shape)", () => {
        assert.equal(parseEnvelope(JSON.stringify({ certId: "c1", ownerId: "x", serial: "SHM-001" })).kind, "invalid")
    })

    it("rejects missing or extra pub fields", () => {
        const noKid = { certId: pub.certId, serial: pub.serial, verifiedAt: pub.verifiedAt, issuer: pub.issuer }
        assert.equal(parseEnvelope(JSON.stringify({ v: 2, pub: noKid, enc, sig })).kind, "invalid")
        assert.equal(parseEnvelope(JSON.stringify({ v: 2, pub: { ...pub, ownerName: "x" }, enc, sig })).kind, "invalid")
    })

    it("rejects a signature that is not 64 bytes, a bad enc, or garbage", () => {
        assert.equal(parseEnvelope(JSON.stringify({ v: 2, pub, enc, sig: toBase64Url(new Uint8Array(10)) })).kind, "invalid")
        assert.equal(parseEnvelope(JSON.stringify({ v: 2, pub, enc: "nope", sig })).kind, "invalid")
        assert.equal(parseEnvelope("{not json").kind, "invalid")
    })

    it("rejects malformed pub values and version", () => {
        const kind = (obj: unknown) => parseEnvelope(JSON.stringify(obj)).kind
        assert.equal(kind({ v: 2, pub: { ...pub, serial: "" }, enc, sig }), "invalid")
        assert.equal(kind({ v: 2, pub: { ...pub, serial: 1 }, enc, sig }), "invalid")
        assert.equal(kind({ v: 2, pub: [pub], enc, sig }), "invalid")
        assert.equal(kind({ v: "2", pub, enc, sig }), "invalid")
        assert.equal(kind({ v: 1, pub, enc, sig }), "invalid")
    })

    it("rejects non-canonical encodings", () => {
        const kind = (obj: unknown) => parseEnvelope(JSON.stringify(obj)).kind
        assert.equal(kind({ v: 2, pub, enc: enc.toUpperCase(), sig }), "invalid")
        assert.equal(kind({ v: 2, pub, enc: enc + "\n", sig }), "invalid")
        assert.equal(kind({ v: 2, pub, enc, sig, x: 1 }), "invalid")
        const malleable = sig.slice(0, -1) + "x"
        assert.deepEqual(fromBase64Url(malleable), fromBase64Url(sig))
        assert.equal(kind({ v: 2, pub, enc, sig: malleable }), "invalid")
    })
})

async function nobleKeyring(kid = "test-1") {
    const { secretKey, publicKey } = await ed.keygenAsync()
    const keyring: Keyring = { activeKid: kid, publicKeys: { [kid]: ed.etc.bytesToHex(publicKey) }, revokedKids: [] }
    const signEnvelope = async (p: SealPublic, e: string) => toBase64Url(await ed.signAsync(buildSigningBytes(p, e), secretKey))
    return { keyring, secretKey, signEnvelope }
}

describe("verifySeal", () => {
    it("accepts a correctly signed envelope", async () => {
        const { keyring, signEnvelope } = await nobleKeyring()
        const verdict = await verifySeal({ v: 2, pub, enc, sig: await signEnvelope(pub, enc) }, keyring)
        assert.deepEqual(verdict, { valid: true, pub })
    })

    it("rejects any change to pub, enc or sig", async () => {
        const { keyring, signEnvelope } = await nobleKeyring()
        const good = await signEnvelope(pub, enc)
        const flipped = fromBase64Url(good)
        flipped[10] ^= 1
        for (const env of [
            { v: 2 as const, pub: { ...pub, serial: "SHM-002" }, enc, sig: good },
            { v: 2 as const, pub, enc: enc.slice(0, -1) + "e", sig: good },
            { v: 2 as const, pub, enc, sig: toBase64Url(flipped) },
        ]) {
            assert.deepEqual(await verifySeal(env, keyring), { valid: false, reason: "bad_signature" })
        }
    })

    it("rejects unknown and revoked kids", async () => {
        const { keyring, signEnvelope } = await nobleKeyring()
        const sig2 = await signEnvelope(pub, enc)
        assert.deepEqual(await verifySeal({ v: 2, pub: { ...pub, kid: "other" }, enc, sig: sig2 }, keyring), { valid: false, reason: "unknown_kid" })
        assert.deepEqual(await verifySeal({ v: 2, pub: { ...pub, kid: "constructor" }, enc, sig: sig2 }, keyring), { valid: false, reason: "unknown_kid" })
        assert.deepEqual(await verifySeal({ v: 2, pub, enc, sig: sig2 }, { ...keyring, revokedKids: ["test-1"] }), { valid: false, reason: "revoked_kid" })
    })

    it("rejects a signature made over bytes without the domain prefix", async () => {
        const { keyring, secretKey } = await nobleKeyring()
        const raw = new TextEncoder().encode(`${canonicalJSON(pub)}\n${enc}`)
        const sig2 = toBase64Url(await ed.signAsync(raw, secretKey))
        assert.deepEqual(await verifySeal({ v: 2, pub, enc, sig: sig2 }, keyring), { valid: false, reason: "bad_signature" })
    })
    it("rejects the small-order forgery (R=identity, S=0) against an all-zero key", async () => {
        const forged = new Uint8Array(64)
        forged[0] = 1
        const zeroRing: Keyring = { activeKid: "test-1", publicKeys: { "test-1": "00".repeat(32) }, revokedKids: [] }
        assert.deepEqual(await verifySeal({ v: 2, pub, enc, sig: toBase64Url(forged) }, zeroRing), { valid: false, reason: "bad_signature" })
    })

    it("reports a malformed keyring entry as verifier_unavailable, never throwing", async () => {
        const { signEnvelope } = await nobleKeyring()
        const good = await signEnvelope(pub, enc)
        for (const bad of ["zz".repeat(32), "abcd", "AB".repeat(32)]) {
            const ring: Keyring = { activeKid: "test-1", publicKeys: { "test-1": bad }, revokedKids: [] }
            assert.deepEqual(await verifySeal({ v: 2, pub, enc, sig: good }, ring), { valid: false, reason: "verifier_unavailable" })
        }
    })
})

describe("DEFAULT_KEYRING", () => {
    it("is well-formed: lowercase 32-byte hex keys, active kid present and not revoked", () => {
        for (const hex of Object.values(DEFAULT_KEYRING.publicKeys)) assert.match(hex, /^[0-9a-f]{64}$/)
        assert.ok(Object.hasOwn(DEFAULT_KEYRING.publicKeys, DEFAULT_KEYRING.activeKid))
        assert.ok(!DEFAULT_KEYRING.revokedKids.includes(DEFAULT_KEYRING.activeKid))
    })
})

describe("signSeal (Node crypto)", () => {
    const savedSeed = process.env.SEAL_SIGNING_KEY
    after(() => {
        if (savedSeed === undefined) delete process.env.SEAL_SIGNING_KEY
        else process.env.SEAL_SIGNING_KEY = savedSeed
    })
    const seed = randomBytes(32).toString("hex")
    const keyring: Keyring = { activeKid: "test-1", publicKeys: { "test-1": publicKeyHexOf(signingKeyFromSeed(seed)) }, revokedKids: [] }

    it("produces signatures that @noble verifies", async () => {
        process.env.SEAL_SIGNING_KEY = seed
        const sig2 = signSeal(pub, enc, keyring)
        assert.deepEqual(await verifySeal({ v: 2, pub, enc, sig: sig2 }, keyring), { valid: true, pub })
    })

    it("derives the same public key as @noble", async () => {
        const noblePub = await ed.getPublicKeyAsync(ed.etc.hexToBytes(seed))
        assert.equal(ed.etc.bytesToHex(noblePub), keyring.publicKeys["test-1"])
    })

    it("refuses a seed that does not match the kid's public key", () => {
        process.env.SEAL_SIGNING_KEY = randomBytes(32).toString("hex")
        assert.throws(() => signSeal(pub, enc, keyring), /tidak cocok/)
    })

    it("refuses to sign for a kid that is not active", () => {
        process.env.SEAL_SIGNING_KEY = seed
        assert.throws(() => signSeal({ ...pub, kid: "old" }, enc, { ...keyring, publicKeys: { ...keyring.publicKeys, old: keyring.publicKeys["test-1"] } }), /aktif/)
    })

    it("refuses to sign when the active kid is revoked", () => {
        process.env.SEAL_SIGNING_KEY = seed
        assert.throws(() => signSeal(pub, enc, { ...keyring, revokedKids: ["test-1"] }), /dicabut/)
    })

    it("refuses a missing or malformed SEAL_SIGNING_KEY", () => {
        delete process.env.SEAL_SIGNING_KEY
        assert.throws(() => signSeal(pub, enc, keyring), /SEAL_SIGNING_KEY/)
        process.env.SEAL_SIGNING_KEY = "abc"
        assert.throws(() => signSeal(pub, enc, keyring), /SEAL_SIGNING_KEY/)
    })

    describe("assertSigningReady", () => {
        it("does not throw for a good setup", () => {
            process.env.SEAL_SIGNING_KEY = seed
            assert.doesNotThrow(() => assertSigningReady(keyring))
        })

        it("throws for a missing or malformed seed", () => {
            delete process.env.SEAL_SIGNING_KEY
            assert.throws(() => assertSigningReady(keyring), /SEAL_SIGNING_KEY/)
            process.env.SEAL_SIGNING_KEY = "abc"
            assert.throws(() => assertSigningReady(keyring), /SEAL_SIGNING_KEY/)
        })

        it("throws for a seed that does not match the active public key", () => {
            process.env.SEAL_SIGNING_KEY = randomBytes(32).toString("hex")
            assert.throws(() => assertSigningReady(keyring), /tidak cocok/)
        })

        it("throws when the active kid is revoked", () => {
            process.env.SEAL_SIGNING_KEY = seed
            assert.throws(() => assertSigningReady({ ...keyring, revokedKids: ["test-1"] }), /dicabut/)
        })
    })
})

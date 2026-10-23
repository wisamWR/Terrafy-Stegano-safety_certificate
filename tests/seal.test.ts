import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
    buildSigningBytes, canonicalJSON, fromBase64Url, parseEnvelope, serializeEnvelope, toBase64Url,
    type SealPublic,
} from "../src/lib/seal/envelope"

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

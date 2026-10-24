import { after, describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomBytes, randomFillSync } from "node:crypto"
import { crc32 } from "node:zlib"
import { PNG } from "pngjs"
import { Steganography } from "../src/lib/steganography"
import { serializeEnvelope, type SealPublic } from "../src/lib/seal/envelope"
import { publicKeyHexOf, signSeal, signingKeyFromSeed } from "../src/lib/seal/sign"
import { checkSealLocally } from "../src/lib/seal/local-check"
import type { Keyring } from "../src/lib/seal/public-keys"

const savedSeed = process.env.SEAL_SIGNING_KEY
after(() => {
    if (savedSeed === undefined) delete process.env.SEAL_SIGNING_KEY
    else process.env.SEAL_SIGNING_KEY = savedSeed
})

const seed = randomBytes(32).toString("hex")
const keyring: Keyring = { activeKid: "test-1", publicKeys: { "test-1": publicKeyHexOf(signingKeyFromSeed(seed)) }, revokedKids: [] }
const pub: SealPublic = { certId: "c1", serial: "SHM-009", verifiedAt: "2026-10-23T08:00:00.000Z", issuer: "Terrafy", kid: "test-1" }
const enc = "00112233445566778899aabb:00112233445566778899aabbccddeeff:abcdef"

function cover(): Buffer {
    const img = new PNG({ width: 80, height: 80 })
    randomFillSync(img.data)
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255
    return PNG.sync.write(img)
}

async function sealedSeal(): Promise<{ image: Buffer; text: string }> {
    process.env.SEAL_SIGNING_KEY = seed
    const text = serializeEnvelope({ v: 2, pub, enc, sig: signSeal(pub, enc, keyring) })
    return { image: await Steganography.embed(cover(), text), text }
}

async function sealedImage(): Promise<Buffer> {
    return (await sealedSeal()).image
}

/** Inserts an optional suggested-palette chunk (PLTE) right after IHDR of a truecolour PNG. */
function withSuggestedPalette(png: Buffer): Buffer {
    const ihdrEnd = 8 + 4 + 4 + 13 + 4
    const type = Buffer.from("PLTE")
    const data = Buffer.from([0, 0, 0])
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([type, data])))
    return Buffer.concat([png.subarray(0, ihdrEnd), length, type, data, crc, png.subarray(ihdrEnd)])
}

describe("checkSealLocally", () => {
    it("reports a valid v2 seal with its public data", async () => {
        assert.deepEqual(await checkSealLocally(await sealedImage(), keyring), {
            state: "valid", serial: "SHM-009", issuedAt: pub.verifiedAt, kid: "test-1", issuer: "Terrafy",
        })
    })

    it("reports a seal whose public data was altered as a bad signature", async () => {
        const { image, text } = await sealedSeal()
        const img = PNG.sync.read(image)
        // 11 = STEGOv1 magic (7) + length (4); +6 is the last char of the serial: "9" (0x39) becomes "8" (0x38)
        const byte = 11 + text.indexOf("SHM-009") + 6
        const ch = byte * 8
        img.data[Math.floor(ch / 3) * 4 + (ch % 3)] ^= 1
        assert.deepEqual(await checkSealLocally(PNG.sync.write(img), keyring), { state: "invalid", reason: "bad_signature" })
    })

    it("reports a hidden payload that is not a seal as malformed", async () => {
        assert.deepEqual(await checkSealLocally(await Steganography.embed(cover(), "not a seal"), keyring), { state: "invalid", reason: "malformed" })
    })

    it("passes revoked and unknown kids through", async () => {
        const image = await sealedImage()
        assert.deepEqual(await checkSealLocally(image, { ...keyring, revokedKids: ["test-1"] }), { state: "invalid", reason: "revoked_kid" })
        const other: Keyring = { activeKid: "other", publicKeys: { other: keyring.publicKeys["test-1"] }, revokedKids: [] }
        assert.deepEqual(await checkSealLocally(image, other), { state: "invalid", reason: "unknown_kid" })
    })

    it("reports an unusable keyring as unavailable, not forged", async () => {
        const broken: Keyring = { ...keyring, publicKeys: { "test-1": "AB".repeat(32) } }
        assert.deepEqual(await checkSealLocally(await sealedImage(), broken), { state: "unavailable" })
    })

    it("still reads a seal after the image is re-saved as RGB (no alpha)", async () => {
        const rgb = PNG.sync.write(PNG.sync.read(await sealedImage()), { colorType: 2 })
        assert.equal((await checkSealLocally(rgb, keyring)).state, "valid")
    })

    it("still reads an RGB seal that carries an optional suggested palette", async () => {
        const rgb = PNG.sync.write(PNG.sync.read(await sealedImage()), { colorType: 2 })
        const withPlte = withSuggestedPalette(rgb)
        assert.ok(withPlte.includes("PLTE"))
        assert.equal((await checkSealLocally(withPlte, keyring)).state, "valid")
    })

    it("reports a legacy v1 seal", async () => {
        assert.deepEqual(await checkSealLocally(await Steganography.embed(cover(), enc), keyring), { state: "legacy" })
    })

    it("reports none for a plain image", async () => {
        assert.deepEqual(await checkSealLocally(cover(), keyring), { state: "none" })
    })

    it("reports unsupported for non-PNG, truncated, 16-bit, grayscale and oversized images", async () => {
        assert.deepEqual(await checkSealLocally(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]), keyring), { state: "unsupported" })
        assert.deepEqual(await checkSealLocally((await sealedImage()).subarray(0, 60), keyring), { state: "unsupported" })

        const img = new PNG({ width: 8, height: 8 })
        assert.deepEqual(await checkSealLocally(PNG.sync.write(img, { bitDepth: 16 }), keyring), { state: "unsupported" })
        assert.deepEqual(await checkSealLocally(PNG.sync.write(img, { colorType: 0 }), keyring), { state: "unsupported" })

        const huge = Buffer.from(cover())
        huge.writeUInt32BE(100000, 16)
        huge.writeUInt32BE(100000, 20)
        assert.deepEqual(await checkSealLocally(huge, keyring), { state: "unsupported" })
    })
})

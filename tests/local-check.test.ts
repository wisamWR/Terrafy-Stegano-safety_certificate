import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomBytes, randomFillSync } from "node:crypto"
import { PNG } from "pngjs"
import { Steganography } from "../src/lib/steganography"
import { serializeEnvelope, type SealPublic } from "../src/lib/seal/envelope"
import { publicKeyHexOf, signSeal, signingKeyFromSeed } from "../src/lib/seal/sign"
import { checkSealLocally } from "../src/lib/seal/local-check"
import type { Keyring } from "../src/lib/seal/public-keys"

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

async function sealedImage(): Promise<Buffer> {
    process.env.SEAL_SIGNING_KEY = seed
    return Steganography.embed(cover(), serializeEnvelope({ v: 2, pub, enc, sig: signSeal(pub, enc, keyring) }))
}

describe("checkSealLocally", () => {
    it("reports a valid v2 seal with its public data", async () => {
        assert.deepEqual(await checkSealLocally(await sealedImage(), keyring), {
            state: "valid", serial: "SHM-009", issuedAt: pub.verifiedAt, kid: "test-1", issuer: "Terrafy",
        })
    })

    it("reports a tampered seal as invalid", async () => {
        const img = PNG.sync.read(await sealedImage())
        const ch = 2000 // inside the envelope text
        img.data[Math.floor(ch / 3) * 4 + (ch % 3)] ^= 1
        const verdict = await checkSealLocally(PNG.sync.write(img), keyring)
        assert.equal(verdict.state, "invalid")
    })

    it("still reads a seal after the image is re-saved as RGB (no alpha)", async () => {
        const rgb = PNG.sync.write(PNG.sync.read(await sealedImage()), { colorType: 2 })
        assert.equal((await checkSealLocally(rgb, keyring)).state, "valid")
    })

    it("reports a legacy v1 seal", async () => {
        assert.deepEqual(await checkSealLocally(await Steganography.embed(cover(), enc), keyring), { state: "legacy" })
    })

    it("reports none for a plain image and unsupported for non-PNG bytes", async () => {
        assert.deepEqual(await checkSealLocally(cover(), keyring), { state: "none" })
        assert.deepEqual(await checkSealLocally(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]), keyring), { state: "unsupported" })
    })
})

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomFillSync } from "node:crypto"
import { PNG } from "pngjs"
import { Steganography } from "../src/lib/steganography"
import { LegacySteganography } from "./fixtures/legacy-steganography"

function makePng(width: number, height: number, alpha = 255): Buffer {
    const png = new PNG({ width, height })
    randomFillSync(png.data)
    for (let i = 3; i < png.data.length; i += 4) png.data[i] = alpha
    return PNG.sync.write(png)
}

describe("Steganography", () => {
    it("round-trips ASCII and multi-byte UTF-8 messages", async () => {
        const cover = makePng(64, 64)
        for (const msg of ["hello", "Sertifikat Tanah — Ñ ✓ 土地", "a:b:c"]) {
            const stego = await Steganography.embed(cover, msg)
            assert.equal(await Steganography.reveal(stego), msg)
        }
    })

    it("writes the exact same pixels as the original implementation", async () => {
        const cover = makePng(50, 40)
        const msg = "iv:tag:" + "ab".repeat(200)
        const ours = PNG.sync.read(await Steganography.embed(cover, msg)).data
        const legacy = PNG.sync.read(await LegacySteganography.embed(cover, msg)).data
        assert.ok(Buffer.compare(ours, legacy) === 0)
    })

    it("reads images produced by the original implementation", async () => {
        const msg = "issued-before-the-refactor"
        const legacyStego = await LegacySteganography.embed(makePng(30, 30), msg)
        assert.equal(await Steganography.reveal(legacyStego), msg)
    })

    it("never touches the alpha channel", async () => {
        const cover = makePng(20, 20, 128)
        const out = PNG.sync.read(await Steganography.embed(cover, "x".repeat(100))).data
        for (let i = 3; i < out.length; i += 4) assert.equal(out[i], 128)
    })

    it("only changes the least significant bit of each channel", async () => {
        const cover = makePng(20, 20)
        const before = PNG.sync.read(cover).data
        const after = PNG.sync.read(await Steganography.embed(cover, "y".repeat(120))).data
        for (let i = 0; i < before.length; i++) assert.ok((before[i] ^ after[i]) <= 1)
    })

    it("fills an image exactly to capacity and rejects one byte more", async () => {
        const w = 10, h = 10
        const capacityBytes = Math.floor((w * h * 3) / 8) - "STEGOv1".length - 4
        const cover = makePng(w, h)
        const full = "z".repeat(capacityBytes)
        assert.equal(await Steganography.reveal(await Steganography.embed(cover, full)), full)
        await assert.rejects(() => Steganography.embed(cover, full + "z"), /too small/i)
    })

    it("rejects an image without hidden data", async () => {
        await assert.rejects(() => Steganography.reveal(makePng(40, 40)), /tidak ditemukan/)
    })

    it("rejects a header whose declared length exceeds the image", async () => {
        const png = PNG.sync.read(await Steganography.embed(makePng(20, 20), "abc"))
        // Overwrite the 32-bit length field (bits 56..87) with all ones.
        let ch = 0
        for (let i = 0; i < png.data.length && ch < 88; i++) {
            if ((i + 1) % 4 === 0) continue
            if (ch >= 56) png.data[i] |= 1
            ch++
        }
        await assert.rejects(() => Steganography.reveal(PNG.sync.write(png)), /rusak/)
    })

    it("rejects non-PNG input", async () => {
        await assert.rejects(() => Steganography.reveal(Buffer.from("not an image")), /PNG/)
    })

    it("handles a large image quickly", async () => {
        const cover = makePng(1500, 1500)
        const msg = "q".repeat(5000)
        const t0 = performance.now()
        const out = await Steganography.reveal(await Steganography.embed(cover, msg))
        const ms = performance.now() - t0
        assert.equal(out, msg)
        assert.ok(ms < 5000, `took ${ms.toFixed(0)}ms`)
    })
})

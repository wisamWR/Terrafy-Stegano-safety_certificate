import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { randomFillSync } from "node:crypto"
import { embedIntoRGBA, extractFromRGBA, LsbCapacityError, LsbCorruptError, LsbNotFoundError } from "../src/lib/seal/lsb"

const rgba = (pixels: number) => randomFillSync(new Uint8Array(pixels * 4))
const utf8 = (s: string) => new TextEncoder().encode(s)

describe("lsb layout", () => {
    it("round-trips bytes through a raw RGBA array", () => {
        const data = rgba(400)
        embedIntoRGBA(data, utf8("halo ✓"))
        assert.equal(new TextDecoder().decode(extractFromRGBA(data)), "halo ✓")
    })

    it("does not touch alpha bytes", () => {
        const data = rgba(400)
        const alphas = data.filter((_, i) => i % 4 === 3)
        embedIntoRGBA(data, utf8("x".repeat(60)))
        assert.deepEqual(data.filter((_, i) => i % 4 === 3), alphas)
    })

    it("throws LsbCapacityError when the message does not fit", () => {
        assert.throws(() => embedIntoRGBA(rgba(10), utf8("too long for ten pixels")), LsbCapacityError)
    })

    it("throws LsbNotFoundError without the magic header", () => {
        assert.throws(() => extractFromRGBA(new Uint8Array(400 * 4)), LsbNotFoundError)
    })

    it("throws LsbCorruptError when the length field exceeds capacity", () => {
        const data = rgba(100)
        embedIntoRGBA(data, utf8("abc"))
        // length field = channels 56..87; force all ones
        for (let ch = 56; ch < 88; ch++) data[Math.floor(ch / 3) * 4 + (ch % 3)] |= 1
        assert.throws(() => extractFromRGBA(data), LsbCorruptError)
    })
})

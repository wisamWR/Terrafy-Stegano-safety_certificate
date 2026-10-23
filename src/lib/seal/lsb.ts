// The only implementation of the LSB bit layout. Shared by the server (pngjs) and the browser (fast-png).
// Must stay stable - already issued certificates depend on it:
//   "STEGOv1" | uint32 LE message length | message bytes
// Bytes are written LSB-first, one bit per channel, R,G,B of each pixel in order (alpha skipped).

const MAGIC = new TextEncoder().encode("STEGOv1")
const HEADER_BYTES = MAGIC.length + 4
const MASK = 0xfe

export class LsbCapacityError extends Error {}
export class LsbNotFoundError extends Error {
    constructor() {
        super("Sertifikat tidak memiliki data autentikasi (Steganografi tidak ditemukan).")
    }
}
export class LsbCorruptError extends Error {
    constructor() {
        super("Data steganografi rusak atau tidak valid.")
    }
}

/** Index into the RGBA buffer of the n-th usable (non-alpha) channel. */
const channelIndex = (n: number) => Math.floor(n / 3) * 4 + (n % 3)

/** Payload bytes (header included) an RGBA buffer can hold. */
const capacityBytes = (rgba: Uint8Array) => Math.floor(((rgba.length / 4) * 3) / 8)

function readByte(rgba: Uint8Array, byteOffset: number): number {
    let byte = 0
    let ch = byteOffset * 8
    for (let bit = 0; bit < 8; bit++, ch++) byte |= (rgba[channelIndex(ch)] & 1) << bit
    return byte
}

/** Writes `message` into the LSBs of `rgba` in place. */
export function embedIntoRGBA(rgba: Uint8Array, message: Uint8Array): void {
    const full = new Uint8Array(HEADER_BYTES + message.length)
    full.set(MAGIC, 0)
    new DataView(full.buffer).setUint32(MAGIC.length, message.length, true)
    full.set(message, HEADER_BYTES)

    const needed = full.length * 8
    const capacity = (rgba.length / 4) * 3
    if (needed > capacity) {
        throw new LsbCapacityError(`Image is too small. Needs ${needed} bits, has ${capacity} capacity.`)
    }

    let ch = 0
    for (let i = 0; i < full.length; i++) {
        const byte = full[i]
        for (let bit = 0; bit < 8; bit++, ch++) {
            const idx = channelIndex(ch)
            rgba[idx] = (rgba[idx] & MASK) | ((byte >> bit) & 1)
        }
    }
}

/** Reads the hidden message bytes, reading only the bits it needs. */
export function extractFromRGBA(rgba: Uint8Array): Uint8Array {
    const capacity = capacityBytes(rgba)
    if (capacity < HEADER_BYTES) throw new LsbNotFoundError()
    for (let i = 0; i < MAGIC.length; i++) {
        if (readByte(rgba, i) !== MAGIC[i]) throw new LsbNotFoundError()
    }

    const size =
        (readByte(rgba, MAGIC.length) |
            (readByte(rgba, MAGIC.length + 1) << 8) |
            (readByte(rgba, MAGIC.length + 2) << 16) |
            (readByte(rgba, MAGIC.length + 3) << 24)) >>> 0
    if (size <= 0 || size > capacity - HEADER_BYTES) throw new LsbCorruptError()

    const out = new Uint8Array(size)
    for (let i = 0; i < size; i++) out[i] = readByte(rgba, HEADER_BYTES + i)
    return out
}

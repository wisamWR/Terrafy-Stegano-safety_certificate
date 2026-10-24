import { decode } from "fast-png"
import { extractFromRGBA, LsbCorruptError, LsbNotFoundError } from "./lsb"

export type RevealResult = { kind: "found"; text: string } | { kind: "none" } | { kind: "unsupported" }

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
// Larger images are not certificates we issue; refusing them avoids multi-GB decodes in the browser
const MAX_PIXELS = 40_000_000

/** Width/height from the IHDR chunk (always first), or null if this is not a PNG. */
function pngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
    if (bytes.length < 24 || PNG_SIGNATURE.some((b, i) => bytes[i] !== b)) return null
    if (String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]) !== "IHDR") return null
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    return { width: view.getUint32(16), height: view.getUint32(20) }
}

/**
 * Decodes PNG bytes with a pure-JS decoder (never <canvas>: premultiplied alpha and colour
 * management can alter RGB values and destroy LSB data) and reads the hidden text.
 */
export function revealFromPngBytes(bytes: Uint8Array): RevealResult {
    const size = pngDimensions(bytes)
    if (!size || size.width * size.height > MAX_PIXELS) return { kind: "unsupported" }

    let image: ReturnType<typeof decode>
    try {
        image = decode(bytes)
    } catch {
        return { kind: "unsupported" }
    }
    if (image.depth !== 8 || (image.channels !== 3 && image.channels !== 4)) {
        return { kind: "unsupported" }
    }

    let rgba = image.data as Uint8Array
    if (image.channels === 3) {
        rgba = new Uint8Array(image.width * image.height * 4)
        for (let p = 0, s = 0; p < rgba.length; p += 4, s += 3) {
            rgba[p] = image.data[s]
            rgba[p + 1] = image.data[s + 1]
            rgba[p + 2] = image.data[s + 2]
            rgba[p + 3] = 255
        }
    }

    try {
        return { kind: "found", text: new TextDecoder().decode(extractFromRGBA(rgba)) }
    } catch (error) {
        if (error instanceof LsbNotFoundError || error instanceof LsbCorruptError) return { kind: "none" }
        throw error
    }
}

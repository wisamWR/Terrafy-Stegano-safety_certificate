import { decode } from "fast-png"
import { extractFromRGBA, LsbCorruptError, LsbNotFoundError } from "./lsb"
import { MAX_PIXELS, pngDimensions } from "./png-header"

export type RevealResult = { kind: "found"; text: string } | { kind: "none" } | { kind: "unsupported" }

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
        return { kind: "found", text: new TextDecoder("utf-8", { ignoreBOM: true }).decode(extractFromRGBA(rgba)) }
    } catch (error) {
        if (error instanceof LsbNotFoundError || error instanceof LsbCorruptError) return { kind: "none" }
        throw error
    }
}

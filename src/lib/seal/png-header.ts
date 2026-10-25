// Isomorphic (no Node APIs): shared by the server (pngjs) and the browser (fast-png) readers.

export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
// Larger images are not certificates we issue; refusing them avoids multi-GB decodes
export const MAX_PIXELS = 40_000_000

/** Width/height from the IHDR chunk (always first), or null if this is not a PNG. */
export function pngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
    if (bytes.length < 24 || PNG_SIGNATURE.some((b, i) => bytes[i] !== b)) return null
    if (String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]) !== "IHDR") return null
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    return { width: view.getUint32(16), height: view.getUint32(20) }
}

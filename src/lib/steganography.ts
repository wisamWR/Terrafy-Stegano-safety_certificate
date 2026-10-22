import { PNG } from 'pngjs';

/**
 * A simple LSB (Least Significant Bit) steganography utility for PNG images.
 * This implementation hides data in the low-order bits of the RGB channels.
 *
 * Layout (must stay stable - already issued certificates depend on it):
 *   "STEGOv1" | uint32 LE message length | message bytes
 * Bytes are written LSB-first, one bit per channel, R,G,B of each pixel in order (alpha skipped).
 */
export class Steganography {
    private static MASK = 0xFE; // 11111110
    private static MAGIC_HEADER = "STEGOv1"; // Signature to identify valid stego data
    private static HEADER_BYTES = Buffer.byteLength(Steganography.MAGIC_HEADER) + 4;

    /** Number of payload bytes (header included) an RGBA buffer can hold. */
    private static capacityBytes(rgba: Buffer): number {
        return Math.floor(((rgba.length / 4) * 3) / 8);
    }

    /** Index into the RGBA buffer of the n-th usable (non-alpha) channel. */
    private static channelIndex(n: number): number {
        return Math.floor(n / 3) * 4 + (n % 3);
    }

    private static readByte(rgba: Buffer, byteOffset: number): number {
        let byte = 0;
        let ch = byteOffset * 8;
        for (let bit = 0; bit < 8; bit++, ch++) {
            byte |= (rgba[this.channelIndex(ch)] & 1) << bit;
        }
        return byte;
    }

    private static decode(inputBuffer: Buffer): PNG {
        try {
            return PNG.sync.read(inputBuffer);
        } catch {
            throw new Error('Format file corrupt atau bukan PNG valid.');
        }
    }

    /**
     * Embeds a string message into a PNG image buffer.
     * @param inputBuffer - The source image buffer (must be PNG).
     * @param message - The string message to hide.
     * @returns A Promise resolving to the resulting PNG buffer with hidden data.
     */
    static async embed(inputBuffer: Buffer, message: string): Promise<Buffer> {
        const png = this.decode(inputBuffer);
        const data = png.data;

        const messageBuffer = Buffer.from(message, 'utf8');
        const sizeBuffer = Buffer.alloc(4);
        sizeBuffer.writeUInt32LE(messageBuffer.length, 0);
        const fullBuffer = Buffer.concat([Buffer.from(this.MAGIC_HEADER, 'utf8'), sizeBuffer, messageBuffer]);

        const totalBitsNeeded = fullBuffer.length * 8;
        const capacityBits = (data.length / 4) * 3;
        if (totalBitsNeeded > capacityBits) {
            throw new Error(`Image is too small. Needs ${totalBitsNeeded} bits, has ${capacityBits} capacity.`);
        }

        let ch = 0;
        for (let i = 0; i < fullBuffer.length; i++) {
            const byte = fullBuffer[i];
            for (let bit = 0; bit < 8; bit++, ch++) {
                const idx = this.channelIndex(ch);
                data[idx] = (data[idx] & this.MASK) | ((byte >> bit) & 1);
            }
        }

        return PNG.sync.write(png, { filterType: 4 });
    }

    /**
     * Reveals a hidden string message from a PNG image buffer.
     * Reads only the bits it needs instead of materialising every LSB of the image.
     * @param inputBuffer - The PNG image buffer containing hidden data.
     */
    static async reveal(inputBuffer: Buffer): Promise<string> {
        const data = this.decode(inputBuffer).data;
        const capacity = this.capacityBytes(data);
        const headerLen = Buffer.byteLength(this.MAGIC_HEADER);

        // 1. Check Magic Header
        if (capacity < this.HEADER_BYTES) {
            throw new Error('Sertifikat tidak memiliki data autentikasi (Steganografi tidak ditemukan).');
        }
        for (let i = 0; i < headerLen; i++) {
            if (this.readByte(data, i) !== this.MAGIC_HEADER.charCodeAt(i)) {
                throw new Error('Sertifikat tidak memiliki data autentikasi (Steganografi tidak ditemukan).');
            }
        }

        // 2. Extract Message Size (uint32 LE)
        const sizeBytes = Buffer.alloc(4);
        for (let i = 0; i < 4; i++) sizeBytes[i] = this.readByte(data, headerLen + i);
        const messageSize = sizeBytes.readUInt32LE(0);

        if (messageSize <= 0 || messageSize > capacity - this.HEADER_BYTES) {
            throw new Error('Data steganografi rusak atau tidak valid.');
        }

        // 3. Extract Message
        const messageBuffer = Buffer.alloc(messageSize);
        for (let i = 0; i < messageSize; i++) {
            messageBuffer[i] = this.readByte(data, this.HEADER_BYTES + i);
        }

        return messageBuffer.toString('utf8');
    }
}

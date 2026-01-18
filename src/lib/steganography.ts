import { PNG } from 'pngjs';
import * as fs from 'fs/promises';

/**
 * A simple LSB (Least Significant Bit) steganography utility for PNG images.
 * This implementation hides data in the low-order bits of the RGB channels.
 */
export class Steganography {
    private static MASK = 0xFE; // 11111110
    private static MAGIC_HEADER = "STEGOv1"; // Signature to identify valid stego data

    /**
     * Embeds a string message into a PNG image.
     */
    static async embed(inputPath: string, outputPath: string, message: string): Promise<void> {
        console.log(`[STEGO-LIB] Embedding into ${inputPath}...`);
        const data = await fs.readFile(inputPath);
        const png = PNG.sync.read(data);

        // Header: Signature + Message Size (32-bit)
        const headerBuffer = Buffer.from(this.MAGIC_HEADER, 'utf8');
        const messageBuffer = Buffer.from(message, 'utf8');
        const messageSize = messageBuffer.length;

        const sizeBuffer = Buffer.alloc(4);
        sizeBuffer.writeUInt32LE(messageSize, 0);

        const fullBuffer = Buffer.concat([headerBuffer, sizeBuffer, messageBuffer]);
        const totalBitsNeeded = fullBuffer.length * 8;

        // Check capacity (each pixel has 3 subpixels: R, G, B)
        // pngjs data is RGBA, so 4 bytes per pixel. We only use R, G, B.
        const capacityBits = (png.data.length / 4) * 3;

        if (totalBitsNeeded > capacityBits) {
            throw new Error(`Image is too small. Needs ${totalBitsNeeded} bits, has ${capacityBits} capacity.`);
        }

        // Prepare bit stream
        const bits: number[] = [];
        for (let i = 0; i < fullBuffer.length; i++) {
            const byte = fullBuffer[i];
            for (let bit = 0; bit < 8; bit++) {
                bits.push((byte >> bit) & 1);
            }
        }

        // Embed bits into RGB channels
        let bitIdx = 0;
        for (let i = 0; i < png.data.length && bitIdx < bits.length; i++) {
            // Skip the Alpha channel (index 3, 7, 11, ...)
            if ((i + 1) % 4 === 0) continue;

            png.data[i] = (png.data[i] & this.MASK) | bits[bitIdx];
            bitIdx++;
        }

        const outputBuffer = PNG.sync.write(png);
        await fs.writeFile(outputPath, outputBuffer);
        console.log(`[STEGO-LIB] Saved stego image to ${outputPath}`);
    }

    /**
     * Reveals a hidden string message from a PNG image.
     */
    static async reveal(imagePath: string): Promise<string> {
        console.log(`[STEGO-LIB] Revealing from ${imagePath}...`);
        const data = await fs.readFile(imagePath);

        let png;
        try {
            png = PNG.sync.read(data);
        } catch (e) {
            throw new Error('Format file tidak didukung. Harap gunakan file PNG asli.');
        }

        const bits: number[] = [];
        // Extract all potential LSBs from RGB channels
        for (let i = 0; i < png.data.length; i++) {
            if ((i + 1) % 4 === 0) continue;
            bits.push(png.data[i] & 1);
        }

        // Function to extract a byte at a specific bit offset
        const getByte = (bitOffset: number) => {
            let byte = 0;
            for (let i = 0; i < 8; i++) {
                byte |= (bits[bitOffset + i] << i);
            }
            return byte;
        };

        // 1. Check Magic Header
        const headerLen = this.MAGIC_HEADER.length;
        let extractedHeader = "";
        for (let i = 0; i < headerLen; i++) {
            extractedHeader += String.fromCharCode(getByte(i * 8));
        }

        if (extractedHeader !== this.MAGIC_HEADER) {
            console.warn(`[STEGO-LIB] Header mismatch: expected ${this.MAGIC_HEADER}, got ${extractedHeader}`);
            throw new Error('Sertifikat tidak memiliki data autentikasi (Steganografi tidak ditemukan).');
        }

        // 2. Extract Message Size (32-bit after header)
        let messageSize = 0;
        const sizeOffset = headerLen * 8;
        for (let i = 0; i < 4; i++) {
            messageSize |= (getByte(sizeOffset + (i * 8)) << (i * 8));
        }

        console.log(`[STEGO-LIB] Found header. Message size: ${messageSize} bytes`);

        if (messageSize <= 0 || messageSize > (bits.length / 8) - headerLen - 4) {
            throw new Error('Data steganografi rusak atau tidak valid.');
        }

        // 3. Extract Message
        const messageBuffer = Buffer.alloc(messageSize);
        const messageOffset = (headerLen + 4) * 8;
        for (let i = 0; i < messageSize; i++) {
            messageBuffer[i] = getByte(messageOffset + (i * 8));
        }

        return messageBuffer.toString('utf8');
    }
}

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
     * Embeds a string message into a PNG image buffer.
     * @param inputBuffer - The source image buffer (must be PNG).
     * @param message - The string message to hide.
     * @returns A Promise resolving to the resulting PNG buffer with hidden data.
     */
    static async embed(inputBuffer: Buffer, message: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            new PNG({ filterType: 4 }).parse(inputBuffer, (error, png) => {
                if (error) return reject(error);

                try {
                    // Header: Signature + Message Size (32-bit)
                    const headerBuffer = Buffer.from(this.MAGIC_HEADER, 'utf8');
                    const messageBuffer = Buffer.from(message, 'utf8');
                    const messageSize = messageBuffer.length;

                    const sizeBuffer = Buffer.alloc(4);
                    sizeBuffer.writeUInt32LE(messageSize, 0);

                    const fullBuffer = Buffer.concat([headerBuffer, sizeBuffer, messageBuffer]);
                    const totalBitsNeeded = fullBuffer.length * 8;

                    // Check capacity
                    const capacityBits = (png.data.length / 4) * 3;

                    if (totalBitsNeeded > capacityBits) {
                        return reject(new Error(`Image is too small. Needs ${totalBitsNeeded} bits, has ${capacityBits} capacity.`));
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
                        // Skip Alpha channel (index 3, 7, 11, ...)
                        if ((i + 1) % 4 === 0) continue;

                        png.data[i] = (png.data[i] & this.MASK) | bits[bitIdx];
                        bitIdx++;
                    }

                    // Pack back to Buffer
                    const outputBuffer = PNG.sync.write(png);
                    resolve(outputBuffer);

                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    /**
     * Reveals a hidden string message from a PNG image buffer.
     * @param inputBuffer - The PNG image buffer containing hidden data.
     */
    static async reveal(inputBuffer: Buffer): Promise<string> {
        return new Promise((resolve, reject) => {
            new PNG().parse(inputBuffer, (error, png) => {
                if (error) return reject(new Error('Format file corrupt atau bukan PNG valid.'));

                try {
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
                        return reject(new Error('Sertifikat tidak memiliki data autentikasi (Steganografi tidak ditemukan).'));
                    }

                    // 2. Extract Message Size
                    let messageSize = 0;
                    const sizeOffset = headerLen * 8;
                    for (let i = 0; i < 4; i++) {
                        messageSize |= (getByte(sizeOffset + (i * 8)) << (i * 8));
                    }

                    if (messageSize <= 0 || messageSize > (bits.length / 8) - headerLen - 4) {
                        return reject(new Error('Data steganografi rusak atau tidak valid.'));
                    }

                    // 3. Extract Message
                    const messageBuffer = Buffer.alloc(messageSize);
                    const messageOffset = (headerLen + 4) * 8;
                    for (let i = 0; i < messageSize; i++) {
                        messageBuffer[i] = getByte(messageOffset + (i * 8));
                    }

                    resolve(messageBuffer.toString('utf8'));

                } catch (err) {
                    reject(err);
                }
            });
        });
    }
}

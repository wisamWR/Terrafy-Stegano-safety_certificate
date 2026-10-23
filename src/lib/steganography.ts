import { PNG } from 'pngjs';
import { embedIntoRGBA, extractFromRGBA } from '@/lib/seal/lsb';

/**
 * LSB steganography for PNG images (server side). The bit layout lives in src/lib/seal/lsb.ts,
 * shared with the browser verifier; this class only decodes/encodes PNG with pngjs.
 */
export class Steganography {
    private static decode(inputBuffer: Buffer): PNG {
        try {
            return PNG.sync.read(inputBuffer);
        } catch {
            throw new Error('Format file corrupt atau bukan PNG valid.');
        }
    }

    /** Embeds a UTF-8 string into a PNG and returns the new PNG bytes. */
    static async embed(inputBuffer: Buffer, message: string): Promise<Buffer> {
        const png = this.decode(inputBuffer);
        embedIntoRGBA(png.data, Buffer.from(message, 'utf8'));
        return PNG.sync.write(png, { filterType: 4 });
    }

    /** Reveals the hidden UTF-8 string from a PNG. */
    static async reveal(inputBuffer: Buffer): Promise<string> {
        return Buffer.from(extractFromRGBA(this.decode(inputBuffer).data)).toString('utf8');
    }
}


import { PrismaClient } from "@prisma/client"
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import * as fs from 'fs'
import * as path from 'path'
import { Steganography } from '../src/lib/steganography'

// Try to load dotenv if available, for safety
try { require('dotenv').config(); } catch (e) { }

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({
    adapter,
})

async function runTest() {
    console.log("=== STARTING NODE.JS VERIFICATION FLOW TEST ===");

    // 1. Setup Data
    let user = await prisma.user.findFirst({ where: { email: 'test_verify@example.com' } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                id: 'tu1',
                email: 'test_verify@example.com',
                password: 'hashedpassword',
                name: 'Test Verify User',
                role: 'USER'
            }
        });
    }

    // Create a dummy certificate
    const timestamp = Date.now();
    const certNum = `TEST/VERIFY/${timestamp}`;
    const cert = await prisma.certificate.create({
        data: {
            nomor_sertifikat: certNum,
            nama_lahan: "Lahan Test Verifikasi (Node)",
            luas_tanah: "100 m2",
            lokasi: "Jl. Test Verifikasi No. 1",
            keterangan: "Sertifikat untuk testing sistem verifikasi Node.js",
            ownerId: user.id,
            status: "PENDING",
            image_url: "/uploads/test_cert_source.png"
        }
    });

    console.log(`[TEST] Created Certificate: ${cert.id} (${cert.nomor_sertifikat})`);

    // Create a dummy source image
    // Since we now use pngjs, we need a VALID PNG.
    const sourceImagePath = path.join(process.cwd(), "public", "uploads", "test_cert_source.png");
    try {
        const uploadDir = path.dirname(sourceImagePath);
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        // Use a simple 100x100 white PNG
        const { PNG } = require('pngjs');
        const png = new PNG({ width: 100, height: 100 });
        for (let y = 0; y < png.height; y++) {
            for (let x = 0; x < png.width; x++) {
                const idx = (png.width * y + x) << 2;
                png.data[idx] = 255;   // R
                png.data[idx + 1] = 255; // G
                png.data[idx + 2] = 255; // B
                png.data[idx + 3] = 255; // A
            }
        }
        const buffer = PNG.sync.write(png);
        fs.writeFileSync(sourceImagePath, buffer);
        console.log("[TEST] Created valid source PNG.");
    } catch (e) {
        console.error("[TEST] Failed to create source image.", (e as Error).message);
    }


    // 2. Simulate Admin Verification (Trigger Stego)
    console.log("[TEST] Simulating Admin Verification (Embedding data)...");

    const payload = {
        certId: cert.id,
        ownerId: cert.ownerId,
        verifiedAt: new Date().toISOString(),
        validator: "System Test Node",
        serial: cert.nomor_sertifikat
    };

    const stegoDir = path.join(process.cwd(), "public", "uploads", "stego");
    if (!fs.existsSync(stegoDir)) fs.mkdirSync(stegoDir, { recursive: true });

    const outputFilename = `cert_${timestamp}_stego.png`;
    const outputPath = path.join(stegoDir, outputFilename);
    const payloadStr = JSON.stringify(payload);

    try {
        console.log(`[TEST] Embedding: ${payloadStr}`);
        await Steganography.embed(sourceImagePath, outputPath, payloadStr);
        console.log(`[TEST] Embed Success: ${outputPath}`);
    } catch (e) {
        console.error("[TEST] Embedding failed:", e);
        // Clean up and exit
        await prisma.certificate.delete({ where: { id: cert.id } });
        return;
    }

    // 3. Simulate Verification (Reveal)
    console.log("[TEST] Simulating Public Verification (Revealing data)...");

    try {
        const revealedMessage = await Steganography.reveal(outputPath);
        console.log(`[TEST] Reveal Output: ${revealedMessage}`);

        const hiddenData = JSON.parse(revealedMessage);
        console.log("[TEST] Decoded Data:", hiddenData);

        // Assertions
        if (hiddenData.certId !== cert.id) throw new Error("Cert ID mismatch!");
        if (hiddenData.serial !== cert.nomor_sertifikat) throw new Error("Serial mismatch!");

        console.log("=== TEST PASSED: Node.js Steganography Flow is Valid ===");

    } catch (e) {
        console.error("[TEST] Reveal/Verification failed:", e);
    }

    // Cleanup
    await prisma.certificate.delete({ where: { id: cert.id } });
    if (fs.existsSync(sourceImagePath)) fs.unlinkSync(sourceImagePath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
}

runTest()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

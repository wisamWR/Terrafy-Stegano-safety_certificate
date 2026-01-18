
import { PrismaClient } from "@prisma/client"
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import * as fs from 'fs'
import * as path from 'path'

// Try to load dotenv if available
try { require('dotenv').config(); } catch (e) { }

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({
    adapter,
})

async function cleanup() {
    console.log("=== STARTING SYSTEM CLEANUP ===");

    try {
        // 1. Delete Database Records (Order matters for foreign keys)
        console.log("[DB] Clearing SteganographyMetadata...");
        await prisma.steganographyMetadata.deleteMany({});

        console.log("[DB] Clearing History...");
        await prisma.history.deleteMany({});

        console.log("[DB] Clearing Notifications...");
        await prisma.notification.deleteMany({});

        console.log("[DB] Clearing AdminAuditLogs...");
        await prisma.adminAuditLog.deleteMany({});

        console.log("[DB] Clearing Certificates...");
        await prisma.certificate.deleteMany({});

        console.log(">>> Database cleared successfully.");

        // 2. Clear Filesystem
        const uploadsDir = path.join(process.cwd(), "public", "uploads");

        const clearDir = (dir: string) => {
            if (!fs.existsSync(dir)) return;
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                if (fs.lstatSync(fullPath).isDirectory()) {
                    clearDir(fullPath);
                    // Don't delete the directories themselves, just content
                    // Actually, let's keep 'stego' and 'temp' folders
                } else {
                    fs.unlinkSync(fullPath);
                    console.log(`[FS] Deleted: ${item}`);
                }
            }
        };

        console.log("[FS] Clearing public/uploads...");
        clearDir(uploadsDir);

        console.log(">>> Filesystem cleared successfully.");
        console.log("=== CLEANUP COMPLETED ===");

    } catch (error) {
        console.error("Cleanup failed:", error);
    }
}

cleanup()
    .finally(async () => {
        await prisma.$disconnect();
    });

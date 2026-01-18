
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
    console.log("Starting Direct SQL update...");
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("DATABASE_URL not found in environment.");
        process.exit(1);
    }

    const pool = new pg.Pool({ connectionString });

    try {
        console.log("Connecting to database...");
        const client = await pool.connect();
        console.log("Connected.");

        try {
            console.log("Adding columns to History table...");
            await client.query(`ALTER TABLE "History" ADD COLUMN IF NOT EXISTS "owner_name" VARCHAR(200)`);
            await client.query(`ALTER TABLE "History" ADD COLUMN IF NOT EXISTS "owner_email" VARCHAR(200)`);

            console.log("Adding stegoImageUrl to Certificate table (if missing)...");
            await client.query(`ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "stegoImageUrl" TEXT`);

            console.log("Populating current owner into existing history records...");
            await client.query(`
                UPDATE "History" h
                SET owner_name = u.name, owner_email = u.email
                FROM "Certificate" c
                JOIN "User" u ON c."ownerId" = u.id
                WHERE h."certificateId" = c.id AND h.owner_name IS NULL
            `);

            console.log("Database updated successfully!");
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Error updating database:", error);
    } finally {
        await pool.end();
    }
}

main();

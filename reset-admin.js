
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const email = 'admin@bps.go.id';
    // Update to plain text 'admin123' so the fallback in logic works guaranteed.
    // Or we could hash it. Let's try plain text first for absolute certainty.
    // The app's auth.ts has: const isPlainMatch = password === user.password

    const updated = await prisma.user.update({
        where: { email },
        data: { password: 'admin123' }
    });

    console.log(`Updated password for ${updated.email} to 'admin123' (plain text).`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

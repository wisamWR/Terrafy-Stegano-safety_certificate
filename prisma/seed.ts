import { PrismaClient, Role, Status, LandType, NotificationType } from "@prisma/client"
import * as bcrypt from "bcryptjs"
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({
    adapter,
    log: ["query", "info", "warn", "error"],
})

async function main() {
    console.log("Start seeding...")

    // 1. Clean data (in correct order due to foreign key constraints)
    await prisma.adminAuditLog.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.steganographyMetadata.deleteMany()
    await prisma.history.deleteMany()
    await prisma.certificate.deleteMany()
    await prisma.user.deleteMany()

    console.log("Cleaned existing data")

    // 2. Create Users with hashed passwords
    const hashedPassword = await bcrypt.hash("password123", 10)
    const hashedAdminPassword = await bcrypt.hash("admin123", 10)

    const ridelo = await prisma.user.upsert({
        where: { email: "user@gmail.com" },
        update: {},
        create: {
            id: "u1",
            email: "user@gmail.com",
            password: await bcrypt.hash("password123", 10),
            name: "User Demo",
            role: "USER",
        },
    })

    const budi = await prisma.user.create({
        data: {
            id: "u2",
            name: "Budi Santoso",
            email: "budi@gmail.com",
            password: hashedPassword,
            role: Role.USER,
        },
    })

    const siti = await prisma.user.create({
        data: {
            id: "u3",
            name: "Siti Aminah",
            email: "siti@gmail.com",
            password: hashedPassword,
            role: Role.USER,
        },
    })

    const admin = await prisma.user.create({
        data: {
            id: "a1",
            name: "Admin Pusat",
            email: "admin@bps.go.id",
            password: hashedAdminPassword,
            role: Role.ADMIN,
        },
    })

    console.log("Users created with hashed passwords")

    // 3. Create Certificates & History (SKIPPED FOR CLEAN START)
    /* 
    // Certificate 1 - VERIFIED
    const cert1 = await prisma.certificate.create({
        ...
    })
    ...
    console.log("Admin Audit Logs created") 
    */
    console.log("Skipped dummy certificates/logs for Clean Start")
    console.log("Seeding finished successfully!")
}

main()
    .catch((e) => {
        console.error("Seeding error:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

require("dotenv/config")
const { Pool } = require("pg")
const { PrismaPg } = require("@prisma/adapter-pg")
const { PrismaClient } = require("@prisma/client")

const connectionString = process.env.DATABASE_URL || "postgresql://postgres.hhobzqmncardhfhgrvgq:walahjostenan@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log("Start seeding (JS)...")

    // 1. Clean data
    await prisma.history.deleteMany()
    await prisma.certificate.deleteMany()
    await prisma.user.deleteMany()

    // 2. Create Users
    const ridelo = await prisma.user.create({
        data: {
            id: "u1",
            name: "Ridelo",
            email: "ridelo@gmail.com",
            password: "password123",
            role: "USER",
        },
    })

    const budi = await prisma.user.create({
        data: {
            id: "u2",
            name: "Budi Santoso",
            email: "budi@gmail.com",
            password: "password123",
            role: "USER",
        },
    })

    const siti = await prisma.user.create({
        data: {
            id: "u3",
            name: "Siti Aminah",
            email: "siti@gmail.com",
            password: "password123",
            role: "USER",
        },
    })

    const admin = await prisma.user.create({
        data: {
            id: "a1",
            name: "Admin Pusat",
            email: "admin@bps.go.id",
            password: "admin",
            role: "ADMIN",
        },
    })

    console.log("Users created")

    // 3. Create Certificates & History
    await prisma.certificate.create({
        data: {
            id: "c1",
            nomor_sertifikat: "111/SRTV/X/2006",
            nama_lahan: "Tanah Warisan Kakek",
            luas_tanah: "500 m2",
            lokasi: "Jl. Merdeka No. 10, Semarang",
            status: "VERIFIED",
            ownerId: ridelo.id,
            keterangan: "Tanah pekarangan siap bangun",
            history: {
                create: [
                    {
                        actor_name: "Ridelo",
                        actor_email: "ridelo@gmail.com",
                        action: "Sertifikat Diterbitkan",
                        note: "Penerbitan sertifikat baru",
                        date: new Date("2024-01-15T08:30:45Z"),
                    },
                ],
            },
        },
    })

    await prisma.certificate.create({
        data: {
            id: "c2",
            nomor_sertifikat: "222/SRTV/XI/2010",
            nama_lahan: "Ruko Simpang Lima",
            luas_tanah: "120 m2",
            lokasi: "Kawasan Simpang Lima, Semarang",
            status: "VERIFIED",
            ownerId: ridelo.id,
            keterangan: "Ruko 3 lantai",
            history: {
                create: [
                    {
                        actor_name: "Budi Santoso",
                        actor_email: "budi@gmail.com",
                        action: "Sertifikat Diterbitkan",
                        note: "Penerbitan sertifikat baru",
                        date: new Date("2023-11-20T14:15:30Z"),
                    },
                    {
                        actor_name: "Ridelo",
                        actor_email: "ridelo@gmail.com",
                        action: "Jual Beli",
                        note: "Pembelian Lunas",
                        date: new Date("2024-02-02T10:00:00Z"),
                    },
                ],
            },
        },
    })

    await prisma.certificate.create({
        data: {
            id: "c3",
            nomor_sertifikat: "333/SRTV/XII/2015",
            nama_lahan: "Sertifikat Kebun Teh",
            luas_tanah: "2000 m2",
            lokasi: "Wonosobo, Jawa Tengah",
            status: "PENDING",
            ownerId: siti.id,
            keterangan: "Kebun produktif",
            history: {
                create: [
                    {
                        actor_name: "Siti Aminah",
                        actor_email: "siti@gmail.com",
                        action: "Sertifikat Diterbitkan",
                        note: "Penerbitan sertifikat baru",
                        date: new Date("2015-01-01T10:00:00Z"),
                    },
                ],
            },
        },
    })

    console.log("Certificates & History created")
    console.log("Seeding finished.")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

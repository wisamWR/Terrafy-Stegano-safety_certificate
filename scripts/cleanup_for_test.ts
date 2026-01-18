import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Cleaning up database for fresh test ---')

    // Delete in order to respect foreign keys
    const d3 = await prisma.notification.deleteMany({})
    console.log('Deleted notifications:', d3.count)

    const d1 = await prisma.history.deleteMany({})
    console.log('Deleted history:', d1.count)

    const d2 = await prisma.steganographyMetadata.deleteMany({})
    console.log('Deleted stego metadata:', d2.count)

    const d4 = await prisma.certificate.deleteMany({})
    console.log('Deleted certificates:', d4.count)

    console.log('\n--- Cleanup Complete ---')
    console.log('Anda sekarang bisa membuat sertifikat baru dan memulai alur transfer.')
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())

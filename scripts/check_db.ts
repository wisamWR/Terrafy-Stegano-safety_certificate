import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Checking Users ---')
    const users = await prisma.user.findMany()
    console.log('Total Users:', users.length)
    users.forEach(u => console.log(`- ${u.name} (${u.email}) [${u.role}] ID: ${u.id}`))

    console.log('\n--- Checking Certificates ---')
    const certs = await prisma.certificate.findMany()
    console.log('Total Certificates:', certs.length)
    certs.forEach(c => console.log(`- ${c.nama_lahan} (${c.nomor_sertifikat}) Status: ${c.status} OwnerID: ${c.ownerId}`))

    console.log('\n--- Checking Pending Actions ---')
    const pending = certs.filter(c => c.status === 'PENDING')
    console.log('Pending Certificates:', pending.length)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())

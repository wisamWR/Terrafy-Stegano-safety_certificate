import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Checking Transfer Requests ---')

    const certificates = await prisma.certificate.findMany({
        where: {
            status: 'AWAITING_RECIPIENT' as any
        },
        include: {
            owner: true
        }
    })

    console.log(`Found ${certificates.length} certificates awaiting recipient:`)
    certificates.forEach(c => {
        console.log(`- ID: ${c.id}, Name: ${c.nama_lahan}, To: ${c.transferToEmail}, Current Owner: ${c.owner.email}`)
    })

    console.log('\n--- Checking Notifications ---')
    const notifications = await prisma.notification.findMany({
        where: {
            type: 'TRANSFER_REQUEST' as any
        },
        include: {
            user: true
        }
    })

    console.log(`Found ${notifications.length} transfer request notifications:`)
    notifications.forEach(n => {
        console.log(`- ID: ${n.id}, User: ${n.user.email}, Title: ${n.title}, Created: ${n.createdAt}`)
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())

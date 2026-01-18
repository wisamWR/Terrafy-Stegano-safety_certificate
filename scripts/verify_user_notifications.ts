import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

let prisma: PrismaClient;

async function main() {
    const connectionString = process.env.DATABASE_URL
    const pool = new Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    prisma = new PrismaClient({ adapter })

    const email = 'ridlo@example.com'
    console.log(`--- Checking user and notifications ---`)

    const user = await prisma.user.findUnique({
        where: { email }
    })

    if (!user) {
        console.log(`User ${email} not found!`)
        return
    }

    console.log(`User found: ID=${user.id}, Name=${user.name}`)

    const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
    })

    console.log(`Found ${notifications.length} notifications:`)
    notifications.forEach(n => {
        console.log(`- Type: ${n.type}, Title: ${n.title}, Read: ${n.isRead}, Created: ${n.createdAt}`)
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())

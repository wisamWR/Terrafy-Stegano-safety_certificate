import "dotenv/config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    try {
        console.log("Testing connection...")
        const users = await prisma.user.findMany()
        console.log("Connection successful!")
        console.log("Current users in DB:", users.length)
    } catch (error) {
        console.error("Connection failed!")
        console.error(error)
    } finally {
        await prisma.$disconnect()
    }
}

main()

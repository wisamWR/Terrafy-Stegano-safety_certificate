import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const prismaClientSingleton = () => {
  // Gunakan connection string dari environment
  const connectionString = process.env.DATABASE_URL

  // Supabase pooler memakai rantai sertifikat yang tidak dikenali Node. Longgarkan hanya untuk koneksi
  // database ini, jangan lewat NODE_TLS_REJECT_UNAUTHORIZED=0 yang mematikan verifikasi TLS seluruh proses.
  const pool = new Pool({
    connectionString,
    ssl: connectionString?.includes("localhost") ? undefined : { rejectUnauthorized: false },
  })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma

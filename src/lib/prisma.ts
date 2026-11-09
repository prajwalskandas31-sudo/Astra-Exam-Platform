import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// One client (and one connection pool) per server instance. Cached on globalThis in every
// environment: dev hot-reloads would otherwise leak pools, and on Vercel Fluid Compute one
// instance serves many concurrent requests that should share the pool.
// DATABASE_URL must be the *pooled* Neon URL (PgBouncer) so many instances can share Postgres.
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

globalForPrisma.prisma = prisma

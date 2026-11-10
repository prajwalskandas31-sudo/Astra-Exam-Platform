import { PrismaClient } from '@prisma/client'

// A test's start code is shown only to staff running the exam centre. It is left out of every
// query by default, so no route can leak it to students by returning a test object; staff
// code asks for it explicitly with `omit: { startCode: false }` or `select: { startCode: true }`.
const createClient = () => new PrismaClient({ omit: { test: { startCode: true } } })

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createClient> | undefined
}

// One client (and one connection pool) per server instance. Cached on globalThis in every
// environment: dev hot-reloads would otherwise leak pools, and on Vercel Fluid Compute one
// instance serves many concurrent requests that should share the pool.
// DATABASE_URL must be the *pooled* Neon URL (PgBouncer) so many instances can share Postgres.
export const prisma = globalForPrisma.prisma ?? createClient()

globalForPrisma.prisma = prisma

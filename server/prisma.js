const { PrismaClient } = require('./prisma/generated-client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const globalForPrisma = globalThis;

let prisma;

if (!globalForPrisma.prisma) {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
  globalForPrisma.prisma = prisma;
} else {
  prisma = globalForPrisma.prisma;
}

module.exports = { prisma };

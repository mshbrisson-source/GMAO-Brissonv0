// ============================================================
// CONFIG: database
// Singleton Prisma Client — une seule instance dans toute l'app
// ============================================================

const { PrismaClient } = require('@prisma/client');

const prisma = global.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'warn', 'error']
    : ['warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

module.exports = { prisma };

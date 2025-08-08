import { PrismaClient } from '@prisma/client';

// Создаем единственный экземпляр Prisma Client
// Это решает проблему с prepared statements в production

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
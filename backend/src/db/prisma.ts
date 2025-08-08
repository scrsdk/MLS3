import { PrismaClient } from '@prisma/client';

// Создаем единственный экземпляр Prisma Client
// Это решает проблему с prepared statements в production

declare global {
  var prisma: PrismaClient | undefined;
}

// Получаем DATABASE_URL и добавляем параметр для отключения prepared statements
const databaseUrl = process.env.DATABASE_URL;
let datasourceUrl = databaseUrl;

// Добавляем pgbouncer=true для отключения prepared statements
if (databaseUrl && !databaseUrl.includes('pgbouncer=true')) {
  const separator = databaseUrl.includes('?') ? '&' : '?';
  datasourceUrl = `${databaseUrl}${separator}pgbouncer=true&statement_cache_size=0`;
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: datasourceUrl,
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
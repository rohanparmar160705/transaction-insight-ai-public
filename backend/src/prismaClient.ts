/**
 * prismaClient.ts
 * 
 * Prisma Client Singleton with connection retry
 * Ensures:
 * - Only one Prisma Client instance exists (prevents pool exhaustion in dev)
 * - Automatic retries for transient network errors (e.g., ECONNRESET)
 */

import { PrismaClient } from '@prisma/client';

// Global augmentation for TypeScript
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create Prisma Client with logging in development
const prismaClient = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'warn', 'error']
    : ['error'],
});

// Store the client in global in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prismaClient;
}

/**
 * Connect to the database with retry logic.
 * Useful for remote DBs with occasional network blips.
 */
export async function connectWithRetry(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await prismaClient.$connect();
      console.log('✅ Database connected');
      return;
    } catch (err) {
      console.error(`❌ DB connection failed, retry ${i + 1} in ${delay}ms`, err);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('💥 Could not connect to database after retries');
}

// Immediately attempt to connect on import
connectWithRetry();

export default prismaClient;
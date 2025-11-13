/**
 * Prisma Seed Script
 * This script populates the database with initial test data
 * Run with: npm run prisma:seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create a test user
  const hashedPassword = await bcrypt.hash('rohan123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
    },
  });

  console.log('✅ Created test user:', user.email);

  // Create sample transactions
  const sampleTransactions = [
    {
      date: new Date('2024-01-15'),
      description: 'Walmart Grocery Store',
      amount: -85.50,
      type: 'DEBIT' as const,
      category: 'Groceries',
      predictionConfidence: 0.95,
    },
    {
      date: new Date('2024-01-16'),
      description: 'Shell Gas Station',
      amount: -45.20,
      type: 'DEBIT' as const,
      category: 'Transportation',
      predictionConfidence: 0.92,
    },
    {
      date: new Date('2024-01-17'),
      description: 'Netflix Subscription',
      amount: -15.99,
      type: 'DEBIT' as const,
      category: 'Entertainment',
      predictionConfidence: 0.98,
    },
    {
      date: new Date('2024-01-18'),
      description: 'Salary Deposit',
      amount: 3500.00,
      type: 'CREDIT' as const,
      category: 'Income',
      predictionConfidence: 0.99,
    },
    {
      date: new Date('2024-01-19'),
      description: 'Amazon Purchase',
      amount: -129.99,
      type: 'DEBIT' as const,
      category: 'Shopping',
      predictionConfidence: 0.88,
    },
  ];

  for (const txn of sampleTransactions) {
    await prisma.transaction.create({
      data: {
        ...txn,
        userId: user.id,
      },
    });
  }

  console.log(`✅ Created ${sampleTransactions.length} sample transactions`);
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
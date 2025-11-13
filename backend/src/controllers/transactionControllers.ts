/**
 * Transaction Controller
 * Handles transaction listing and insights/analytics
 */

import { Response } from 'express';
import { AuthRequest, ApiResponse, InsightsData } from '../types';
import prisma from '../prismaClient';
import logger from '../utils/logger';

/**
 * Get all transactions for authenticated user
 * GET /api/transactions
 * Query params: page, limit, category, startDate, endDate
 */
export async function getTransactions(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      } as ApiResponse);
      return;
    }

    const userId = req.user.userId;

    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const category = req.query.category as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // Build filter
    const where: any = { userId };

    if (category) {
      where.category = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Fetch transactions with pagination
    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          date: true,
          description: true,
          amount: true,
          type: true,
          category: true,
          predictionConfidence: true,
          createdAt: true,
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    logger.info(`Retrieved ${transactions.length} transactions for user ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    } as ApiResponse);
  } catch (error) {
    logger.error(`Get transactions error: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
    } as ApiResponse);
  }
}

/**
 * Get financial insights and analytics
 * GET /api/insights
 * Query params: startDate, endDate
 */
export async function getInsights(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      } as ApiResponse);
      return;
    }

    const userId = req.user.userId;
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string)
      : new Date(new Date().setMonth(new Date().getMonth() - 6)); // Default: last 6 months
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string)
      : new Date();

    // Fetch all transactions in date range
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate insights
    const insights = calculateInsights(transactions);

    logger.info(`Generated insights for user ${userId}`);

    res.status(200).json({
      success: true,
      data: insights,
    } as ApiResponse);
  } catch (error) {
    logger.error(`Get insights error: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to generate insights',
    } as ApiResponse);
  }
}

/**
 * Calculate financial insights from transactions
 */
function calculateInsights(transactions: any[]): InsightsData {
  // Calculate total income and expenses
  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach(txn => {
    if (txn.type === 'CREDIT') {
      totalIncome += txn.amount;
    } else {
      totalExpenses += txn.amount;
    }
  });

  const netSavings = totalIncome - totalExpenses;

  // Category breakdown
  const categoryMap = new Map<string, { total: number; count: number }>();
  
  transactions.forEach(txn => {
    if (txn.type === 'DEBIT') { // Only expenses
      const existing = categoryMap.get(txn.category) || { total: 0, count: 0 };
      categoryMap.set(txn.category, {
        total: existing.total + txn.amount,
        count: existing.count + 1,
      });
    }
  });

  const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    total: data.total,
    count: data.count,
    percentage: (data.total / totalExpenses) * 100,
  })).sort((a, b) => b.total - a.total);

  // Monthly trend
  const monthlyMap = new Map<string, { income: number; expenses: number }>();
  
  transactions.forEach(txn => {
    const monthKey = txn.date.toISOString().substring(0, 7); // YYYY-MM
    const existing = monthlyMap.get(monthKey) || { income: 0, expenses: 0 };
    
    if (txn.type === 'CREDIT') {
      existing.income += txn.amount;
    } else {
      existing.expenses += txn.amount;
    }
    
    monthlyMap.set(monthKey, existing);
  });

  const monthlyTrend = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Top expenses
  const topExpenses = transactions
    .filter(txn => txn.type === 'DEBIT')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
    .map(txn => ({
      description: txn.description,
      amount: txn.amount,
      date: txn.date,
      category: txn.category,
    }));

  return {
    totalIncome,
    totalExpenses,
    netSavings,
    categoryBreakdown,
    monthlyTrend,
    topExpenses,
  };
}
/**
 * Transaction Routes
 * Defines API endpoints for transactions and insights
 */

import { Router } from 'express';
import { getTransactions, getInsights } from '../controllers/transactionControllers';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * GET /api/transactions
 * Get all transactions for authenticated user
 * Requires authentication
 * Query params: page, limit, category, startDate, endDate
 */
router.get('/', authenticateToken, getTransactions);

/**
 * GET /api/insights
 * Get financial insights and analytics
 * Requires authentication
 * Query params: startDate, endDate
 */
router.get('/insights', authenticateToken, getInsights);

export default router;
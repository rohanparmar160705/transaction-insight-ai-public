/**
 * Express App Configuration
 * Sets up middleware, routes, and error handling
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes';
import uploadRoutes from './routes/uploadRoutes';
import transactionRoutes from './routes/transactionRoutes';
import logger from './utils/logger';

const app: Application = express();

// Security middleware
app.use(helmet()); // Adds security headers

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((_req: Request, _res: Response, next: NextFunction) => {
  logger.http(`${_req.method} ${_req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Backend service is healthy',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/insights', transactionRoutes); // insights route is part of transaction routes

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });

  // Multer file upload errors
  if (err.message.includes('File too large')) {
    res.status(413).json({
      success: false,
      error: 'File too large. Maximum file size is 10MB.',
    });
    return;
  }

  if (err.message.includes('Invalid file type')) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Generic error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message }),
  });
});

export default app;
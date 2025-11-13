/**
 * Authentication Middleware
 * Validates JWT tokens and protects routes
 * Attaches user information to request object for authenticated requests
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JWTPayload } from '../types';
import logger from '../utils/logger';

/**
 * Middleware to verify JWT token and authenticate requests
 * Usage: Add this middleware to routes that require authentication
 * Example: router.get('/protected', authenticateToken, controller)
 */
export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get token from Authorization header
    // Expected format: "Bearer <token>"
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token after "Bearer "

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required. Please provide a valid token in Authorization header.',
      });
      return;
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured in environment variables');
      res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
      return;
    }

    // Decode and verify JWT
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Attach user info to request object for use in controllers
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    logger.debug(`Authenticated user: ${decoded.email}`);
    
    // Continue to next middleware/controller
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired. Please login again.',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token. Please login again.',
      });
      return;
    }

    // Unexpected error
    logger.error(`Authentication error: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}
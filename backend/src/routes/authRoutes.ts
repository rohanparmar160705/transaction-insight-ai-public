/**
 * Authentication Routes
 * Defines API endpoints for user registration and login
 */

import { Router } from 'express';
import { signup, login } from '../controllers/authControllers';

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new user
 * Body: { email, password, name }
 */
router.post('/signup', signup);

/**
 * POST /api/auth/login
 * Login existing user
 * Body: { email, password }
 */
router.post('/login', login);

export default router;
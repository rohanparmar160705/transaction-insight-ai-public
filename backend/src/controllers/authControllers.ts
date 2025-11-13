/**
 * Authentication Controller
 * Handles user registration, login, and token generation
 */

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../prismaClient';
import { RegisterDTO, LoginDTO, ApiResponse } from '../types';
import logger from '../utils/logger';

// Validation schemas using Zod
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Register a new user
 * POST /api/auth/signup
 */
export async function signup(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body) as RegisterDTO;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      } as ApiResponse);
      return;
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = generateToken(String(user.id), user.email);

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
      message: 'User registered successfully',
    } as ApiResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        data: error.issues,
      } as ApiResponse);
      return;
    }

    logger.error(`Signup error: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Failed to register user',
    } as ApiResponse);
  }
}

/**
 * Login existing user
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body) as LoginDTO;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      } as ApiResponse);
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      user.password
    );

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      } as ApiResponse);
      return;
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    logger.info(`User logged in: ${user.email}`);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        token,
      },
      message: 'Login successful',
    } as ApiResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        data: error.issues,
      } as ApiResponse);
      return;
    }

    logger.error(`Login error: ${error}`);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    } as ApiResponse);
  }
}

/**
 * Generate JWT token for authenticated user
 */
function generateToken(userId: string, email: string): string {
  const jwtSecret = process.env.JWT_SECRET as string;
  const jwtExpiry = parseInt(process.env.JWT_EXPIRY || '7', 10) * 24 * 60 * 60;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  // Ensure types match jsonwebtoken's expected types
  const secret: Secret = jwtSecret;
  const signOptions: SignOptions = { expiresIn: jwtExpiry };

  return jwt.sign({ userId, email }, secret, signOptions);
}
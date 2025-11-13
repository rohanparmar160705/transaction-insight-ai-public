/**
 * TypeScript Type Definitions
 * Centralized types for the backend application
 */

import { Request } from 'express';

// Extend Express Request to include authenticated user
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

// Transaction data from CSV/PDF parsing
export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
}

// ML Service prediction request
export interface MLPredictionRequest {
  transactions: {
    description: string;
    amount: number;
    date: string;
    type: string;
  }[];
}

// ML Service prediction response
export interface MLPredictionResponse {
  predictions: {
    category: string;
    confidence: number;
  }[];
}

// Anomaly detection request
export interface AnomalyDetectionRequest {
  transactions: {
    amount: number;
    category: string;
    date: string;
  }[];
}

// Anomaly detection response
export interface AnomalyDetectionResponse {
  anomalies: {
    index: number;
    score: number;
    reason: string;
  }[];
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// User registration/login DTOs
export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

// Insights/Analytics response
export interface InsightsData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  categoryBreakdown: {
    category: string;
    total: number;
    count: number;
    percentage: number;
  }[];
  monthlyTrend: {
    month: string;
    income: number;
    expenses: number;
  }[];
  topExpenses: {
    description: string;
    amount: number;
    date: Date;
    category: string;
  }[];
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
}
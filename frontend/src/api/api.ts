/**
 * API Client Module
 * ==================
 * 
 * This module provides a configured Axios instance for making HTTP requests
 * to the backend API. It handles:
 * - JWT token injection
 * - Token expiry detection
 * - Automatic logout on 401 errors
 * - Request/response interceptors
 * - Error handling
 * 
 * All API calls should use this client instead of raw fetch/axios.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Base URL for backend API
 * Can be configured via environment variable for different environments
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Token storage keys in localStorage
 */
const TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

// ============================================================================
// AXIOS INSTANCE
// ============================================================================

/**
 * Create and configure Axios instance
 * 
 * What is an Axios instance?
 * --------------------------
 * A pre-configured HTTP client with default settings.
 * All requests made with this instance automatically include:
 * - Base URL
 * - Headers
 * - Timeout settings
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Get JWT token from localStorage
 * 
 * Returns null if:
 * - Token doesn't exist
 * - Token has expired
 */
export const getToken = (): string | null => {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

  // Check if token exists and hasn't expired
  if (token && expiry) {
    const expiryTime = parseInt(expiry, 10);
    const currentTime = Date.now();

    // If token is expired, remove it and return null
    if (currentTime >= expiryTime) {
      removeToken();
      return null;
    }

    return token;
  }

  return null;
};

/**
 * Store JWT token in localStorage with expiry
 * 
 * @param token - JWT token from backend
 * @param expiryInDays - Token validity period (default: 7 days)
 */
export const setToken = (token: string, expiryInDays: number = 7): void => {
  // Calculate expiry timestamp (current time + days)
  const expiryTime = Date.now() + expiryInDays * 24 * 60 * 60 * 1000;

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
};

/**
 * Remove token from localStorage (logout)
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return getToken() !== null;
};

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================

/**
 * Request interceptor: Inject JWT token into every request
 * 
 * How it works:
 * -------------
 * 1. Before every API request is sent
 * 2. Get token from localStorage
 * 3. Add token to Authorization header
 * 4. Backend receives request with: "Authorization: Bearer <token>"
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();

    // If token exists and config.headers exists, add Authorization header
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    // Handle request errors (e.g., network issues before request is sent)
    return Promise.reject(error);
  }
);

// ============================================================================
// RESPONSE INTERCEPTOR
// ============================================================================

/**
 * Response interceptor: Handle common errors
 * 
 * Automatically handles:
 * - 401 Unauthorized: Logout user (token expired/invalid)
 * - 403 Forbidden: Access denied
 * - 500 Server Error: Show error message
 */
apiClient.interceptors.response.use(
  (response) => {
    // Pass through successful responses
    return response;
  },
  (error: AxiosError) => {
    // Check if error response exists
    if (error.response) {
      const status = error.response.status;

      // 401 Unauthorized: Token expired or invalid
      if (status === 401) {
        // Remove token and redirect to login
        removeToken();
        
        // Only redirect if not already on login/signup page
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/signup')) {
          window.location.href = '/login';
        }
      }

      // 403 Forbidden: User doesn't have permission
      if (status === 403) {
        console.error('Access denied: You do not have permission to perform this action');
      }

      // 500 Internal Server Error
      if (status >= 500) {
        console.error('Server error: Please try again later');
      }
    } else if (error.request) {
      // Request was made but no response received (network error)
      console.error('Network error: Please check your internet connection');
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// API METHODS
// ============================================================================

/**
 * Authentication API
 */
export const authAPI = {
  /**
   * User login
   * 
   * @param email - User email
   * @param password - User password
   * @returns Promise with user data and token
   */
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    
    // Store token if login successful
    if (response.data.success && response.data.data.token) {
      setToken(response.data.data.token);
    }
    
    return response.data;
  },

  /**
   * User signup
   * 
   * @param email - User email
   * @param password - User password
   * @param name - User name
   * @returns Promise with user data and token
   */
  signup: async (email: string, password: string, name: string) => {
    const response = await apiClient.post('/auth/signup', { email, password, name });
    
    // Store token if signup successful
    if (response.data.success && response.data.data.token) {
      setToken(response.data.data.token);
    }
    
    return response.data;
  },

  /**
   * User logout
   * Simply removes token from localStorage
   */
  logout: () => {
    removeToken();
  },
};

/**
 * Upload API
 */
export const uploadAPI = {
  /**
   * Upload bank statement file (CSV or PDF)
   * 
   * @param file - File object to upload
   * @param onProgress - Optional callback for upload progress
   * @returns Promise with upload result
   */
  uploadFile: async (
    file: File, 
    onProgress?: (progress: number) => void
  ) => {
    // Create FormData to send file
    const formData = new FormData();
    formData.append('file', file);

    // Make request with file upload progress tracking
    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });

    return response.data;
  },
};

/**
 * Transactions API
 */
export const transactionsAPI = {
  /**
   * Get transactions with optional filters
   * 
   * @param params - Query parameters (page, limit, category, dates)
   * @returns Promise with transactions and pagination info
   */
  getTransactions: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await apiClient.get('/transactions', { params });
    return response.data;
  },

  /**
   * Get financial insights and analytics
   * 
   * @param params - Date range for insights
   * @returns Promise with insights data
   */
  getInsights: async (params?: {
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await apiClient.get('/transactions/insights', { params });
    return response.data;
  },
};

/**
 * Health check API (for testing)
 */
export const healthAPI = {
  checkBackend: async () => {
    const response = await axios.get('http://localhost:5000/health');
    return response.data;
  },
  checkML: async () => {
    const response = await axios.get('http://localhost:8000/health');
    return response.data;
  },
};

// ============================================================================
// TYPES
// ============================================================================

/**
 * Common API response types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  category: string;
  predictionConfidence: number;
  createdAt: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface InsightsData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  categoryBreakdown: Array<{
    category: string;
    total: number;
    count: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
  topExpenses: Array<{
    description: string;
    amount: number;
    date: string;
    category: string;
  }>;
}

// Export the configured API client as default
export default apiClient;
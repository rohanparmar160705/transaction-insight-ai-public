/**
 * ML Service Client
 * Handles communication with the FastAPI ML service
 * Sends transactions for category prediction and anomaly detection
 */

import axios, { AxiosInstance } from 'axios';
import {
  MLPredictionRequest,
  MLPredictionResponse,
  AnomalyDetectionRequest,
  AnomalyDetectionResponse,
  ParsedTransaction,
} from '../types';
import logger from '../utils/logger';

class MLClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Log ML service configuration
    logger.info(`ML Client initialized with base URL: ${this.baseURL}`);
  }

  /**
   * Predict categories for a batch of transactions
   */
  async predictCategories(
    transactions: ParsedTransaction[]
  ): Promise<MLPredictionResponse> {
    try {
      logger.info(`Sending ${transactions.length} transactions to ML service for prediction`);

      // Format transactions for ML service
      const request: MLPredictionRequest = {
        transactions: transactions.map(txn => ({
          description: txn.description,
          amount: txn.amount,
          date: txn.date.toISOString(),
          type: txn.type,
        })),
      };

      // Call ML service
      const response = await this.client.post<MLPredictionResponse>(
        '/predict-batch',
        request
      );

      logger.info(`Received predictions from ML service`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.detail || error.message;
        
        logger.error(
          `ML service prediction failed (${statusCode}): ${errorMessage}`
        );
        
        throw new Error(
          `ML prediction failed: ${errorMessage}. Please ensure ML service is running.`
        );
      }
      
      throw error;
    }
  }

  /**
   * Detect anomalies in transaction patterns
   */
  async detectAnomalies(
    transactions: { amount: number; category: string; date: Date }[]
  ): Promise<AnomalyDetectionResponse> {
    try {
      logger.info(`Sending ${transactions.length} transactions for anomaly detection`);

      const request: AnomalyDetectionRequest = {
        transactions: transactions.map(txn => ({
          amount: txn.amount,
          category: txn.category,
          date: txn.date.toISOString(),
        })),
      };

      const response = await this.client.post<AnomalyDetectionResponse>(
        '/detect-anomalies',
        request
      );

      logger.info(`Detected ${response.data.anomalies.length} anomalies`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(
          `ML service anomaly detection failed: ${error.response?.data?.detail || error.message}`
        );
        
        // Anomaly detection is optional, so we return empty result instead of throwing
        return { anomalies: [] };
      }
      
      throw error;
    }
  }

  /**
   * Check if ML service is healthy and available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      logger.warn(`ML service health check failed: ${error}`);
      return false;
    }
  }
}

// Export singleton instance
export default new MLClient();
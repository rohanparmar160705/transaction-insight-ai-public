/**
 * Upload Controller
 * Handles CSV/PDF file uploads, parsing, ML predictions, and storage
 */

import { Response } from 'express';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest, ApiResponse, ParsedTransaction } from '../types';
import { parseCSV } from '../utils/parseCSV';
import { parsePDF } from '../utils/parsePDF';
import mlClient from '../services/mlClient';
import prisma from '../prismaClient';
import logger from '../utils/logger';

/**
 * Upload and process bank statement file (CSV or PDF)
 * POST /api/upload
 */
export async function uploadFile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const uploadId = uuidv4(); // Use uuid for a more robust unique ID

  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      } as ApiResponse);
      return;
    }

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded. Please upload a CSV or PDF file.',
      } as ApiResponse);
      return;
    }

    const file = req.file;
    const userId = req.user.userId;

    logger.info(`Processing upload ${uploadId} for user ${userId}: ${file.originalname}`);

    // Create upload record with the externalId
    const upload = await prisma.upload.create({
      data: {
        externalId: uploadId,
        userId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        status: 'PROCESSING',
      },
    });

    try {
      // Step 1: Parse file based on type
      let transactions: ParsedTransaction[];
      
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        transactions = await parseCSV(file.path);
      } else if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
        transactions = await parsePDF(file.path);
      } else {
        throw new Error('Unsupported file type. Please upload CSV or PDF.');
      }

      if (transactions.length === 0) {
        throw new Error('No transactions found in file');
      }

      logger.info(`Parsed ${transactions.length} transactions from file for upload ${uploadId}`);

      // Step 2: Get ML predictions for categories
      const predictions = await mlClient.predictCategories(transactions);

      if (predictions.predictions.length !== transactions.length) {
        throw new Error('ML prediction count mismatch');
      }

      // Step 3: Store transactions in database, linking them with the generated uploadId
      const transactionRecords = await prisma.transaction.createMany({
        data: transactions.map((txn, index) => ({
          userId,
          uploadId: upload.externalId, // Use the externalId
          date: txn.date,
          description: txn.description,
          amount: txn.amount,
          type: txn.type,
          category: predictions.predictions[index].category,
          predictionConfidence: predictions.predictions[index].confidence,
        })),
      });

      // Step 4: Update upload status
      await prisma.upload.update({
        where: { id: upload.id },
        data: {
          status: 'COMPLETED',
          transactionCount: transactionRecords.count,
        },
      });

      // Step 5: Clean up uploaded file
      await fs.unlink(file.path).catch(err => 
        logger.warn(`Failed to delete uploaded file: ${err}`)
      );

      logger.info(`Successfully processed ${transactionRecords.count} transactions for upload ${uploadId}`);

      // Return success response with the generated uploadId
      res.status(200).json({
        success: true,
        data: {
          uploadId: upload.externalId,
          fileName: file.originalname,
          transactionCount: transactionRecords.count,
        },
        message: `Successfully processed ${transactionRecords.count} transactions`,
      } as ApiResponse);

    } catch (processingError) {
      // Update upload status to failed
      await prisma.upload.update({
        where: { id: upload.id },
        data: {
          status: 'FAILED',
          errorMessage: processingError instanceof Error 
            ? processingError.message 
            : 'Processing failed',
        },
      });

      // Clean up uploaded file
      await fs.unlink(file.path).catch(() => {});

      throw processingError;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload processing failed';
    logger.error(`Upload processing error for upload ${uploadId}: ${errorMessage}`);

    res.status(500).json({
      success: false,
      error: errorMessage,
      uploadId: uploadId, // Include uploadId in error response for tracking
    } as ApiResponse);
  }
}
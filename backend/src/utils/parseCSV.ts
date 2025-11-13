/**
 * CSV Parser Utility
 * Parses bank statement CSV files and extracts transaction data
 * Supports common CSV formats with flexible column mapping
 */

import fs from 'fs';
import csvParser from 'csv-parser';
import { ParsedTransaction } from '../types';
import logger from './logger';

/**
 * Parse a CSV file and extract transactions
 * @param filePath - Path to the CSV file
 * @returns Promise<ParsedTransaction[]>
 */
export async function parseCSV(filePath: string): Promise<ParsedTransaction[]> {
  return new Promise((resolve, reject) => {
    const transactions: ParsedTransaction[] = [];
    const errors: string[] = [];

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row: any) => {
        try {
          // Parse transaction from row
          // Support multiple CSV formats with flexible column names
          const transaction = extractTransactionFromRow(row);
          if (transaction) {
            transactions.push(transaction);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Error parsing row: ${errorMsg}`);
          logger.warn(`CSV parsing error: ${errorMsg}`);
        }
      })
      .on('end', () => {
        if (transactions.length === 0 && errors.length > 0) {
          logger.error(`CSV parsing failed: ${errors.join(', ')}`);
          reject(new Error('No valid transactions found in CSV'));
        } else {
          logger.info(`Successfully parsed ${transactions.length} transactions from CSV`);
          resolve(transactions);
        }
      })
      .on('error', (error) => {
        logger.error(`CSV file read error: ${error.message}`);
        reject(error);
      });
  });
}

/**
 * Extract transaction data from a CSV row
 * Handles various CSV formats by checking multiple possible column names
 */
function extractTransactionFromRow(row: any): ParsedTransaction | null {
  // Try to find date column (common variations)
  const dateValue = 
    row.date || row.Date || row.DATE ||
    row.transaction_date || row['Transaction Date'] ||
    row.posting_date || row['Posting Date'];

  // Try to find description column
  const description = 
    row.description || row.Description || row.DESCRIPTION ||
    row.details || row.Details || row.DETAILS ||
    row.merchant || row.Merchant ||
    row.narrative || row.Narrative;

  // Try to find amount column
  const amountValue = 
    row.amount || row.Amount || row.AMOUNT ||
    row.value || row.Value ||
    row.transaction_amount || row['Transaction Amount'];

  // Try to find debit/credit columns
  const debitValue = row.debit || row.Debit || row.DEBIT || row.withdrawal || row.Withdrawal;
  const creditValue = row.credit || row.Credit || row.CREDIT || row.deposit || row.Deposit;

  // Validate required fields
  if (!dateValue || !description) {
    return null;
  }

  // Parse date
  const date = parseDate(dateValue);
  if (!date) {
    return null;
  }

  // Parse amount and determine type
  let amount: number;
  let type: 'DEBIT' | 'CREDIT';

  if (amountValue !== undefined && amountValue !== null && amountValue !== '') {
    // Single amount column - negative for debit, positive for credit
    amount = parseFloat(String(amountValue).replace(/[^0-9.-]/g, ''));
    type = amount < 0 ? 'DEBIT' : 'CREDIT';
    amount = Math.abs(amount);
  } else if (debitValue !== undefined && debitValue !== null && debitValue !== '') {
    // Separate debit column
    amount = parseFloat(String(debitValue).replace(/[^0-9.-]/g, ''));
    type = 'DEBIT';
  } else if (creditValue !== undefined && creditValue !== null && creditValue !== '') {
    // Separate credit column
    amount = parseFloat(String(creditValue).replace(/[^0-9.-]/g, ''));
    type = 'CREDIT';
  } else {
    return null; // No valid amount found
  }

  // Validate amount
  if (isNaN(amount) || amount <= 0) {
    return null;
  }

  return {
    date,
    description: String(description).trim(),
    amount,
    type,
  };
}

/**
 * Parse various date formats
 * Supports: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, etc.
 */
function parseDate(dateStr: string): Date | null {
  try {
    // Remove extra whitespace
    const cleaned = String(dateStr).trim();
    
    // Try parsing as ISO date first
    let date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try parsing DD/MM/YYYY or MM/DD/YYYY
    const parts = cleaned.split(/[/-]/);
    if (parts.length === 3) {
      // Try DD/MM/YYYY
      date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (!isNaN(date.getTime())) {
        return date;
      }

      // Try MM/DD/YYYY
      date = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}
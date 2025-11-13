/**
 * PDF Parser Utility
 * Extracts text from PDF bank statements and parses transaction data
 * Uses pattern matching to identify transaction lines
 */

import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import { ParsedTransaction } from '../types';
import logger from './logger';

/**
 * Parse a PDF file and extract transactions
 * @param filePath - Path to the PDF file
 * @returns Promise<ParsedTransaction[]>
 */
export async function parsePDF(filePath: string): Promise<ParsedTransaction[]> {
  try {
    // Read PDF file
    const dataBuffer = await fs.readFile(filePath);

    // 👇 assert the type manually because pdf-parse's typings are wrong
    const pdf = pdfParse as unknown as (data: Buffer) => Promise<{ text: string }>;

    const pdfData = await pdf(dataBuffer);
    const text = pdfData.text;

    logger.info(`Extracted ${text.length} characters from PDF`);

    // Extract transactions from text
    const transactions = extractTransactionsFromText(text);

    logger.info(`Successfully parsed ${transactions.length} transactions from PDF`);
    return transactions;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`PDF parsing error: ${errorMsg}`);
    throw new Error(`Failed to parse PDF: ${errorMsg}`);
  }
}

/**
 * Extract transactions from PDF text using pattern matching
 * This is a heuristic approach that works for common bank statement formats
 */
function extractTransactionsFromText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  // Common patterns for transaction lines:
  // 1. Date followed by description and amount
  // 2. Typically: DD/MM/YYYY or MM/DD/YYYY or YYYY-MM-DD
  // 3. Amount: number with optional comma/period separators

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Try to match transaction pattern
    const transaction = parseTransactionLine(trimmedLine);
    if (transaction) {
      transactions.push(transaction);
    }
  }

  return transactions;
}

/**
 * Parse a single line of text as a transaction
 * Returns null if the line doesn't match a transaction pattern
 */
function parseTransactionLine(line: string): ParsedTransaction | null {
  // Pattern 1: Date at the beginning (DD/MM/YYYY or MM/DD/YYYY or YYYY-MM-DD)
  const datePattern = /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/;
  const dateMatch = line.match(datePattern);

  if (!dateMatch) {
    return null;
  }

  const dateStr = dateMatch[1];
  const date = parseDate(dateStr);
  if (!date) {
    return null;
  }

  // Remove date from line
  const remainingLine = line.substring(dateStr.length).trim();

  // Find amount (typically at the end of the line)
  // Pattern: Optional currency symbol, digits with optional commas/periods, optional minus sign
  const amountPattern = /([+-]?[\$£€]?\s?[\d,]+\.?\d*)\s*$/;
  const amountMatch = remainingLine.match(amountPattern);

  if (!amountMatch) {
    return null;
  }

  const amountStr = amountMatch[1];
  const amount = parseFloat(amountStr.replace(/[^\d.-]/g, ''));

  if (isNaN(amount) || amount === 0) {
    return null;
  }

  // Description is everything between date and amount
  const description = remainingLine
    .substring(0, remainingLine.length - amountStr.length)
    .trim();

  if (!description || description.length < 2) {
    return null;
  }

  // Determine transaction type
  const type: 'DEBIT' | 'CREDIT' = amount < 0 || amountStr.includes('-') ? 'DEBIT' : 'CREDIT';

  return {
    date,
    description,
    amount: Math.abs(amount),
    type,
  };
}

/**
 * Parse various date formats
 */
function parseDate(dateStr: string): Date | null {
  try {
    const cleaned = dateStr.trim();
    
    // Try ISO format
    let date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try DD/MM/YYYY or MM/DD/YYYY
    const parts = cleaned.split(/[/-]/);
    if (parts.length === 3) {
      // Expand 2-digit year to 4-digit
      if (parts[2].length === 2) {
        const year = parseInt(parts[2]);
        parts[2] = (year < 50 ? '20' : '19') + parts[2];
      }

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
  } catch {
    return null;
  }
}
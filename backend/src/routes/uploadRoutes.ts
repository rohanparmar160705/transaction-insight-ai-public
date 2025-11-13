/**
 * Upload Routes
 * Defines API endpoints for file uploads
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { uploadFile } from '../controllers/uploadControllers';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (_req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

// File filter - only allow CSV and PDF
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['text/csv', 'application/pdf'];
  const allowedExtensions = ['.csv', '.pdf'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV and PDF files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // Default: 10MB
  },
});

/**
 * POST /api/upload
 * Upload bank statement file (CSV or PDF)
 * Requires authentication
 * Content-Type: multipart/form-data
 * Field name: file
 */
router.post('/', authenticateToken, upload.single('file'), uploadFile);

export default router;
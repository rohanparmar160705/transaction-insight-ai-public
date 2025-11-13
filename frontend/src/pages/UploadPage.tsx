/**
 * Upload Page
 * ============
 * 
 * File upload page for bank statements (CSV/PDF).
 * Features:
 * - Drag and drop file upload
 * - File validation (type, size)
 * - Upload progress bar
 * - Success/error messages
 * - Redirect to dashboard after upload
 */

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, File, CheckCircle, AlertCircle, X } from 'lucide-react';
import { uploadAPI } from '../api/api';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Validate file type and size
   */
  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['text/csv', 'application/pdf'];
    const allowedExtensions = ['.csv', '.pdf'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      return 'Invalid file type. Please upload CSV or PDF files only.';
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return 'File too large. Maximum file size is 10MB.';
    }

    return null;
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = (file: File) => {
    setError('');
    setSuccess(false);
    setUploadResult(null);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
  };

  /**
   * Handle file input change
   */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Handle drag and drop events
   */
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Handle file upload
   */
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      // Upload file with progress tracking
      const result = await uploadAPI.uploadFile(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      if (result.success) {
        setSuccess(true);
        setUploadResult(result.data);
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Upload failed. Please try again.';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Clear selected file
   */
  const handleClear = () => {
    setSelectedFile(null);
    setError('');
    setSuccess(false);
    setUploadResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Bank Statement</h1>
        <p className="text-gray-600 mt-2">
          Upload your CSV or PDF bank statement for automatic categorization
        </p>
      </div>

      {/* Upload Area */}
      <div className="card">
        {/* Error Alert */}
        {error && (
          <div className="alert-error mb-6">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && uploadResult && (
          <div className="alert-success mb-6">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Upload Successful!</p>
              <p className="text-sm mt-1">
                Processed {uploadResult.transactionCount} transactions from {uploadResult.fileName}
              </p>
              <p className="text-sm text-green-700 mt-1">Redirecting to dashboard...</p>
            </div>
          </div>
        )}

        {/* Drag and Drop Area */}
        {!selectedFile && !success && (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-primary-400'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {isDragging ? 'Drop file here' : 'Drag and drop your file here'}
            </h3>
            <p className="text-gray-500 mb-4">or</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
            >
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-sm text-gray-500 mt-4">
              Supported formats: CSV, PDF (Max size: 10MB)
            </p>
          </div>
        )}

        {/* Selected File Preview */}
        {selectedFile && !success && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <File className="h-10 w-10 text-primary-600" />
                <div>
                  <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              {!uploading && (
                <button
                  onClick={handleClear}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Uploading and processing...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This may take a moment. Please don't close this page.
                </p>
              </div>
            )}

            {/* Upload Button */}
            {!uploading && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                <Upload className="h-5 w-5" />
                <span>Upload and Process</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Automatic Categorization</h3>
          <p className="text-sm text-blue-700">
            Our AI automatically categorizes your transactions into meaningful groups
          </p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">Secure Processing</h3>
          <p className="text-sm text-green-700">
            Your data is encrypted and processed securely
          </p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">Instant Insights</h3>
          <p className="text-sm text-purple-700">
            Get detailed financial insights and spending patterns immediately
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
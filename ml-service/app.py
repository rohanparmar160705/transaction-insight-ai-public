"""
Transaction Classification ML Service
======================================

FastAPI-based microservice for predicting transaction categories using ML.

What is FastAPI?
----------------
FastAPI is a modern Python web framework for building APIs.
- Fast: High performance (comparable to NodeJS)
- Easy: Automatic validation, documentation, and error handling
- Type-safe: Uses Python type hints for validation

How this service works:
-----------------------
1. Load trained ML model on startup
2. Expose REST API endpoints for predictions
3. Backend sends transaction descriptions
4. ML model predicts categories
5. Return predictions with confidence scores

Endpoints:
----------
- POST /predict: Predict categories for simple text descriptions
- POST /predict-batch: Predict for full transaction objects
- POST /detect-anomalies: Detect unusual spending patterns
- GET /health: Check if service is running

Architecture:
-------------
Backend (Node.js) ←→ ML Service (Python FastAPI) ←→ ML Model (scikit-learn)

How to run:
-----------
Development:
    uvicorn app:app --reload --port 8001

Production:
    uvicorn app:app --host 0.0.0.0 --port 8001 --workers 4
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import joblib
import numpy as np
from datetime import datetime
from typing import Optional
import os
import sys

# Import our custom schemas and utilities
from schemas import (
    PredictionRequest, PredictionResponse, PredictionResult,
    SimpleTextRequest, AnomalyDetectionRequest, AnomalyDetectionResponse,
    HealthResponse, ErrorResponse
)
from utils import (
    preprocess_descriptions, standardize_category,
    detect_amount_anomalies, validate_transaction_data
)


# ============================================================================
# GLOBAL VARIABLES
# ============================================================================

# Model path (loaded from environment variable or default)
MODEL_PATH = os.getenv('MODEL_PATH', './model.joblib')

# Global variable to store loaded model
# We load once at startup and reuse for all requests (more efficient)
model_bundle: Optional[dict] = None


# ============================================================================
# FASTAPI APPLICATION SETUP
# ============================================================================

# Create FastAPI application instance
# What is an instance?
# --------------------
# It's an object that represents our API server.
# We configure it, add endpoints, and run it.
app = FastAPI(
    title="Transaction Classification ML Service",
    description="Machine learning microservice for categorizing bank transactions",
    version="1.0.0",
    docs_url="/docs",  # Interactive API documentation at /docs
    redoc_url="/redoc"  # Alternative docs at /redoc
)


# ============================================================================
# CORS MIDDLEWARE
# ============================================================================

# Configure CORS (Cross-Origin Resource Sharing)
# What is CORS?
# -------------
# Browser security that blocks requests between different domains.
# We need to allow our Node.js backend to call this Python API.
#
# Without CORS: Browser blocks requests from localhost:5000 → localhost:8001
# With CORS: Requests allowed!

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",  # Node.js backend
        "http://localhost:5173",  # Frontend (if applicable)
        "*"  # Allow all origins (WARNING: only for development!)
    ],
    allow_credentials=True,  # Allow cookies and auth headers
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)


# ============================================================================
# STARTUP EVENT: LOAD MODEL
# ============================================================================

@app.on_event("startup")
async def load_model():
    """
    Load ML model when the server starts.
    
    What is a startup event?
    ------------------------
    Code that runs ONCE when the server starts, before accepting requests.
    Perfect for loading ML models (loading takes time, we don't want to
    reload on every request).
    
    Why async?
    ----------
    FastAPI is asynchronous. Using 'async def' allows the server to handle
    multiple requests concurrently without blocking.
    
    What gets loaded?
    -----------------
    - ML pipeline (TF-IDF vectorizer + classifier)
    - Label encoder (converts numbers ↔ category names)
    - Metadata (categories, version, etc.)
    """
    global model_bundle
    
    print("\n" + "="*60)
    print("🚀 STARTING ML SERVICE")
    print("="*60)
    
    try:
        # Check if model file exists
        if not os.path.exists(MODEL_PATH):
            print(f"❌ ERROR: Model file not found: {MODEL_PATH}")
            print(f"⚠️  Please run 'python train_model.py' first to train the model.")
            sys.exit(1)
        
        # Load model using joblib
        # joblib.load() deserializes the saved model from disk
        print(f"📦 Loading model from {MODEL_PATH}...")
        model_bundle = joblib.load(MODEL_PATH)
        
        # Validate model structure
        required_keys = ['pipeline', 'label_encoder', 'categories']
        if not all(key in model_bundle for key in required_keys):
            raise ValueError(f"Invalid model file. Required keys: {required_keys}")
        
        # Extract components
        pipeline = model_bundle['pipeline']
        categories = model_bundle['categories']
        
        # Print model info
        print(f"✅ Model loaded successfully!")
        print(f"📊 Model version: {model_bundle.get('version', 'unknown')}")
        print(f"🏷️  Categories ({len(categories)}): {', '.join(categories)}")
        print(f"📝 Vocabulary size: {len(pipeline.named_steps['tfidf'].vocabulary_)}")
        print(f"\n✅ ML Service ready to accept requests!")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ FATAL ERROR: Failed to load model")
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Check service health"
)
async def health_check():
    """
    Health check endpoint.
    
    Why is this important?
    ----------------------
    - Docker containers need a way to check if service is running
    - Load balancers ping this to route traffic
    - Monitoring systems check this for alerts
    
    Returns:
    --------
    HealthResponse
        Status information about the service
    
    Example response:
    {
        "status": "healthy",
        "model_loaded": true,
        "timestamp": "2024-01-15T10:30:00",
        "version": "1.0.0"
    }
    """
    return HealthResponse(
        status="healthy",
        model_loaded=model_bundle is not None,
        timestamp=datetime.now().isoformat(),
        version="1.0.0"
    )


# ============================================================================
# PREDICTION ENDPOINT: SIMPLE TEXT
# ============================================================================

@app.post(
    "/predict",
    response_model=PredictionResponse,
    tags=["Predictions"],
    summary="Predict categories for transaction descriptions"
)
async def predict_categories(request: SimpleTextRequest):
    """
    Predict transaction categories from descriptions.
    
    This is the simplest endpoint - just send descriptions, get predictions.
    
    How it works:
    -------------
    1. Receive list of transaction descriptions
    2. Clean and preprocess text
    3. Convert text to numbers using TF-IDF
    4. Run through classifier
    5. Get predicted category + confidence score
    6. Return standardized results
    
    Parameters:
    -----------
    request : SimpleTextRequest
        JSON with 'descriptions' field (list of strings)
    
    Returns:
    --------
    PredictionResponse
        List of predictions with category and confidence
    
    Example request:
    {
        "descriptions": [
            "Walmart Grocery Store",
            "Netflix Subscription",
            "Shell Gas Station"
        ]
    }
    
    Example response:
    {
        "predictions": [
            {"category": "Food", "confidence": 0.95},
            {"category": "Entertainment", "confidence": 0.88},
            {"category": "Transportation", "confidence": 0.92}
        ]
    }
    """
    try:
        # Validate model is loaded
        if model_bundle is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="ML model not loaded. Please restart the service."
            )
        
        # Extract model components
        pipeline = model_bundle['pipeline']
        label_encoder = model_bundle['label_encoder']
        
        # Step 1: Preprocess descriptions
        # This cleans the text (remove numbers, special chars, etc.)
        cleaned_descriptions = preprocess_descriptions(request.descriptions)
        
        # Step 2: Make predictions
        # pipeline.predict() does two things:
        #   a) TF-IDF: Convert text → numbers
        #   b) Classifier: Numbers → predicted category
        predictions = pipeline.predict(cleaned_descriptions)
        
        # Step 3: Get confidence scores (probabilities)
        # predict_proba() returns probability for each category
        # We take the max probability as the confidence
        probabilities = pipeline.predict_proba(cleaned_descriptions)
        confidences = probabilities.max(axis=1)
        
        # Step 4: Convert predictions to category names
        # label_encoder.inverse_transform() converts numbers → text
        # e.g., [0, 1, 2] → ["Food", "Transportation", "Bills"]
        predicted_categories = label_encoder.inverse_transform(predictions)
        
        # Step 5: Standardize categories and build response
        results = []
        for category, confidence in zip(predicted_categories, confidences):
            results.append(PredictionResult(
                category=standardize_category(category),
                confidence=float(confidence)
            ))
        
        return PredictionResponse(predictions=results)
    
    except HTTPException:
        # Re-raise HTTP exceptions (already formatted)
        raise
    
    except Exception as e:
        # Catch any other errors and return 500
        print(f"❌ Prediction error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


# ============================================================================
# PREDICTION ENDPOINT: BATCH WITH FULL TRANSACTION DATA
# ============================================================================

@app.post(
    "/predict-batch",
    response_model=PredictionResponse,
    tags=["Predictions"],
    summary="Predict categories for full transaction objects"
)
async def predict_batch(request: PredictionRequest):
    """
    Predict categories for batch of transactions.
    
    This endpoint accepts full transaction objects (description, amount, date, type).
    Currently, we only use descriptions for prediction, but having full transaction
    data allows for future enhancements (e.g., using amount as a feature).
    
    How this integrates with the backend:
    --------------------------------------
    1. User uploads CSV/PDF to Node.js backend
    2. Backend parses file → list of transactions
    3. Backend calls this endpoint with transaction list
    4. ML service returns predictions
    5. Backend stores predictions in database
    
    Parameters:
    -----------
    request : PredictionRequest
        JSON with 'transactions' field (list of transaction objects)
    
    Returns:
    --------
    PredictionResponse
        List of predictions matching input order
    
    Example request:
    {
        "transactions": [
            {
                "description": "Walmart Grocery Store",
                "amount": 85.50,
                "date": "2024-01-15",
                "type": "DEBIT"
            },
            {
                "description": "Netflix Subscription",
                "amount": 15.99,
                "date": "2024-01-17",
                "type": "DEBIT"
            }
        ]
    }
    
    Example response:
    {
        "predictions": [
            {"category": "Food", "confidence": 0.95},
            {"category": "Entertainment", "confidence": 0.88}
        ]
    }
    """
    try:
        # Validate model is loaded
        if model_bundle is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="ML model not loaded"
            )
        
        # Extract descriptions from transaction objects
        # We only use descriptions for now, but we have access to amount/date/type
        # for future feature engineering
        descriptions = [txn.description for txn in request.transactions]
        
        # Step 1: Preprocess
        cleaned_descriptions = preprocess_descriptions(descriptions)
        
        # Step 2: Predict
        pipeline = model_bundle['pipeline']
        label_encoder = model_bundle['label_encoder']
        
        predictions = pipeline.predict(cleaned_descriptions)
        probabilities = pipeline.predict_proba(cleaned_descriptions)
        confidences = probabilities.max(axis=1)
        
        # Step 3: Build response
        predicted_categories = label_encoder.inverse_transform(predictions)
        
        results = []
        for i, (category, confidence) in enumerate(zip(predicted_categories, confidences)):
            # Log low-confidence predictions for monitoring
            if confidence < 0.5:
                print(f"⚠️  Low confidence prediction: '{descriptions[i]}' → {category} ({confidence:.2f})")
            
            results.append(PredictionResult(
                category=standardize_category(category),
                confidence=float(confidence)
            ))
        
        return PredictionResponse(predictions=results)
    
    except HTTPException:
        raise
    
    except Exception as e:
        print(f"❌ Batch prediction error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction failed: {str(e)}"
        )


# ============================================================================
# ANOMALY DETECTION ENDPOINT
# ============================================================================

@app.post(
    "/detect-anomalies",
    response_model=AnomalyDetectionResponse,
    tags=["Analysis"],
    summary="Detect anomalous spending patterns"
)
async def detect_anomalies(request: AnomalyDetectionRequest):
    """
    Detect unusual transactions based on spending patterns.
    
    What is anomaly detection?
    ---------------------------
    Finding transactions that are unusual or suspicious.
    Examples:
    - $5000 grocery purchase (typically $100)
    - $10 rent payment (typically $1500)
    - Transactions far outside normal range for a category
    
    How it works:
    -------------
    1. Group transactions by category
    2. Calculate statistics (mean, standard deviation)
    3. Flag transactions that are statistical outliers
    4. Use z-scores to measure "how unusual"
    
    Use cases:
    ----------
    - Fraud detection: Catch suspicious charges
    - Budgeting: Alert users about unusual spending
    - Data quality: Find data entry errors
    
    Parameters:
    -----------
    request : AnomalyDetectionRequest
        JSON with 'transactions' field (list with amount, category, date)
    
    Returns:
    --------
    AnomalyDetectionResponse
        List of detected anomalies with explanations
    
    Example request:
    {
        "transactions": [
            {"amount": 50, "category": "Food", "date": "2024-01-15"},
            {"amount": 60, "category": "Food", "date": "2024-01-16"},
            {"amount": 5000, "category": "Food", "date": "2024-01-17"}
        ]
    }
    
    Example response:
    {
        "anomalies": [
            {
                "index": 2,
                "score": 0.95,
                "reason": "Unusually high amount ($5000) for Food category (typical: $55)"
            }
        ]
    }
    """
    try:
        # Validate input
        transactions = request.transactions
        
        if not transactions:
            return AnomalyDetectionResponse(anomalies=[])
        
        # Basic validation
        if not all('amount' in t and 'category' in t for t in transactions):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Each transaction must have 'amount' and 'category' fields"
            )
        
        # Detect anomalies using statistical methods
        # This function uses z-scores to find outliers
        anomalies = detect_amount_anomalies(transactions)
        
        # Log detected anomalies
        if anomalies:
            print(f"⚠️  Detected {len(anomalies)} anomalies:")
            for anomaly in anomalies[:3]:  # Log first 3
                print(f"   - Index {anomaly['index']}: {anomaly['reason']}")
        
        return AnomalyDetectionResponse(anomalies=anomalies)
    
    except HTTPException:
        raise
    
    except Exception as e:
        print(f"❌ Anomaly detection error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Anomaly detection failed: {str(e)}"
        )


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """
    Custom error handler for HTTP exceptions.
    
    Ensures all errors return JSON in a consistent format.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": f"HTTP_{exc.status_code}"
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """
    Catch-all error handler for unexpected exceptions.
    
    Prevents server crashes and returns user-friendly errors.
    """
    print(f"❌ Unexpected error: {str(exc)}")
    import traceback
    traceback.print_exc()
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "error_code": "INTERNAL_ERROR"
        }
    )


# ============================================================================
# ROOT ENDPOINT
# ============================================================================

@app.get("/", tags=["Info"])
async def root():
    """
    Root endpoint with service information.
    
    Returns basic info about the ML service.
    """
    return {
        "service": "Transaction Classification ML Service",
        "version": "1.0.0",
        "status": "running",
        "documentation": "/docs",
        "endpoints": {
            "health": "GET /health",
            "predict": "POST /predict",
            "predict_batch": "POST /predict-batch",
            "detect_anomalies": "POST /detect-anomalies"
        }
    }


# ============================================================================
# RUN SERVER (for development)
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    # Run server with uvicorn
    # uvicorn is an ASGI server (like Express for Node.js)
    print("\n🚀 Starting development server...")
    print("📖 API docs available at: http://localhost:8001/docs")
    
    uvicorn.run(
        "app:app",  # Module:app_instance
        host="0.0.0.0",  # Listen on all interfaces
        port=8001,  # Port number
        reload=True,  # Auto-reload on code changes (development only!)
        log_level="info"
    )
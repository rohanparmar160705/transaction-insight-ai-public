"""
Pydantic Schemas for ML Service
=================================

This module defines data validation schemas using Pydantic.

What is Pydantic?
-----------------
Pydantic is a data validation library that uses Python type annotations.
It automatically validates incoming request data and converts it to the correct types.

Benefits:
- Automatic validation (raises errors if data is invalid)
- Type conversion (strings to dates, etc.)
- Auto-generated API documentation
- Clear error messages

How it works with FastAPI:
--------------------------
1. You define a schema class (like PredictionRequest)
2. FastAPI receives JSON data
3. Pydantic validates and converts the data
4. Your endpoint receives a validated Python object
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
from enum import Enum


# ============================================================================
# ENUMERATIONS
# ============================================================================

class TransactionType(str, Enum):
    """
    Enumeration for transaction types.
    
    Why use Enum?
    - Restricts values to predefined options (DEBIT or CREDIT)
    - Prevents typos and invalid values
    - Auto-generates API documentation with allowed values
    """
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"


class CategoryType(str, Enum):
    """
    Enumeration for transaction categories.
    
    These categories match the training data labels.
    The ML model will predict one of these categories.
    """
    FOOD = "Food"
    TRANSPORTATION = "Transportation"
    ENTERTAINMENT = "Entertainment"
    SHOPPING = "Shopping"
    BILLS = "Bills"
    INCOME = "Income"
    TRAVEL = "Travel"
    TRANSFER = "Transfer"
    INSURANCE = "Insurance"
    INVESTMENT = "Investment"
    OTHER = "Other"  # Fallback category for uncertain predictions


# ============================================================================
# REQUEST SCHEMAS (Input from Backend)
# ============================================================================

class TransactionInput(BaseModel):
    """
    Schema for a single transaction input.
    
    This represents one transaction that needs to be classified.
    
    Fields:
    -------
    - description: The transaction description (e.g., "Walmart Grocery Store")
    - amount: Transaction amount (e.g., 85.50)
    - date: Transaction date (ISO format string or datetime object)
    - type: DEBIT or CREDIT
    
    Example JSON:
    {
        "description": "Starbucks Coffee",
        "amount": 6.75,
        "date": "2024-01-20",
        "type": "DEBIT"
    }
    """
    description: str = Field(
        ...,  # ... means required field
        min_length=1,
        max_length=500,
        description="Transaction description from bank statement"
    )
    amount: float = Field(
        ...,
        gt=0,  # Greater than 0
        description="Transaction amount (must be positive)"
    )
    date: str = Field(
        ...,
        description="Transaction date in ISO format (YYYY-MM-DD)"
    )
    type: TransactionType = Field(
        ...,
        description="Transaction type: DEBIT or CREDIT"
    )

    @validator('description')
    def clean_description(cls, v):
        """
        Custom validator to clean description text.
        
        What does this do?
        ------------------
        - Strips leading/trailing whitespace
        - Ensures description is not empty after cleaning
        
        Validators run automatically when Pydantic processes data.
        They can transform data or raise validation errors.
        """
        v = v.strip()
        if not v:
            raise ValueError("Description cannot be empty")
        return v

    class Config:
        """
        Pydantic configuration class.
        
        json_schema_extra: Provides example data for API documentation.
        This appears in the interactive docs at /docs
        """
        json_schema_extra = {
            "example": {
                "description": "Walmart Grocery Store",
                "amount": 85.50,
                "date": "2024-01-15",
                "type": "DEBIT"
            }
        }


class PredictionRequest(BaseModel):
    """
    Schema for batch prediction requests.
    
    This is used by the /predict-batch endpoint.
    The backend sends a list of transactions to classify.
    
    Example JSON:
    {
        "transactions": [
            {"description": "Walmart", "amount": 85.50, "date": "2024-01-15", "type": "DEBIT"},
            {"description": "Netflix", "amount": 15.99, "date": "2024-01-17", "type": "DEBIT"}
        ]
    }
    """
    transactions: List[TransactionInput] = Field(
        ...,
        min_items=1,
        max_items=1000,  # Limit batch size to prevent memory issues
        description="List of transactions to classify"
    )


class SimpleTextRequest(BaseModel):
    """
    Schema for simple text prediction.
    
    Used by the /predict endpoint for quick single-description classification.
    
    Example JSON:
    {
        "descriptions": ["Walmart Grocery", "Netflix Subscription"]
    }
    """
    descriptions: List[str] = Field(
        ...,
        min_items=1,
        max_items=100,
        description="List of transaction descriptions to classify"
    )

    @validator('descriptions')
    def clean_descriptions(cls, v):
        """Clean and validate each description in the list."""
        cleaned = [desc.strip() for desc in v if desc.strip()]
        if not cleaned:
            raise ValueError("At least one non-empty description is required")
        return cleaned


class AnomalyDetectionRequest(BaseModel):
    """
    Schema for anomaly detection requests.
    
    This is used to detect unusual spending patterns.
    
    How anomaly detection works:
    ----------------------------
    1. Receives a list of transactions with amounts and categories
    2. Uses Isolation Forest algorithm to find outliers
    3. Returns indices of suspicious transactions
    
    Example JSON:
    {
        "transactions": [
            {"amount": 85.50, "category": "Food", "date": "2024-01-15"},
            {"amount": 5000.00, "category": "Food", "date": "2024-01-16"}  # Anomaly!
        ]
    }
    """
    transactions: List[dict] = Field(
        ...,
        min_items=5,  # Need at least 5 transactions for anomaly detection
        description="List of transactions to analyze for anomalies"
    )


# ============================================================================
# RESPONSE SCHEMAS (Output to Backend)
# ============================================================================

class PredictionResult(BaseModel):
    """
    Schema for a single prediction result.
    
    This represents the ML model's prediction for one transaction.
    
    Fields:
    -------
    - category: Predicted category (e.g., "Food", "Transportation")
    - confidence: Confidence score between 0 and 1 (e.g., 0.95 = 95% confident)
    
    Example:
    {
        "category": "Food",
        "confidence": 0.95
    }
    """
    category: str = Field(
        ...,
        description="Predicted transaction category"
    )
    confidence: float = Field(
        ...,
        ge=0.0,  # Greater than or equal to 0
        le=1.0,  # Less than or equal to 1
        description="Prediction confidence score (0-1)"
    )


class PredictionResponse(BaseModel):
    """
    Schema for batch prediction response.
    
    This is what the ML service returns to the backend.
    Contains a list of predictions matching the input transactions.
    
    Example:
    {
        "predictions": [
            {"category": "Food", "confidence": 0.95},
            {"category": "Entertainment", "confidence": 0.88}
        ]
    }
    """
    predictions: List[PredictionResult] = Field(
        ...,
        description="List of predictions, one for each input transaction"
    )


class AnomalyResult(BaseModel):
    """
    Schema for a single anomaly detection result.
    
    Fields:
    -------
    - index: Position of the anomalous transaction in the input list
    - score: Anomaly score (higher = more unusual)
    - reason: Human-readable explanation
    """
    index: int = Field(
        ...,
        ge=0,
        description="Index of the anomalous transaction"
    )
    score: float = Field(
        ...,
        description="Anomaly score (higher values indicate more unusual patterns)"
    )
    reason: str = Field(
        ...,
        description="Explanation of why this transaction is anomalous"
    )


class AnomalyDetectionResponse(BaseModel):
    """
    Schema for anomaly detection response.
    
    Returns a list of detected anomalies.
    Empty list means no anomalies detected.
    
    Example:
    {
        "anomalies": [
            {
                "index": 5,
                "score": 0.82,
                "reason": "Unusually high amount for Food category ($5000)"
            }
        ]
    }
    """
    anomalies: List[AnomalyResult] = Field(
        default=[],
        description="List of detected anomalies"
    )


class HealthResponse(BaseModel):
    """
    Schema for health check endpoint response.
    
    Used by the /health endpoint to report service status.
    """
    status: str = Field(default="healthy", description="Service health status")
    model_loaded: bool = Field(..., description="Whether ML model is loaded")
    timestamp: str = Field(..., description="Current server timestamp")
    version: str = Field(default="1.0.0", description="ML service version")


class ErrorResponse(BaseModel):
    """
    Schema for error responses.
    
    Used when something goes wrong (validation errors, ML errors, etc.)
    
    Example:
    {
        "detail": "Invalid input: description cannot be empty",
        "error_code": "VALIDATION_ERROR"
    }
    """
    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Machine-readable error code")
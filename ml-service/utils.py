"""
Utility Functions for ML Service
==================================

This module contains helper functions for:
- Text preprocessing and cleaning
- Category mapping and standardization
- Feature engineering
- Anomaly detection logic

These utilities are used by both the training script and the API.
"""

import re
import string
from typing import List, Dict, Any
import numpy as np
import pandas as pd


# ============================================================================
# TEXT PREPROCESSING
# ============================================================================

def clean_text(text: str) -> str:
    """
    Clean and normalize transaction description text.
    
    What does this function do?
    ---------------------------
    1. Converts to lowercase for consistency
    2. Removes special characters and numbers
    3. Removes extra whitespace
    4. Removes common banking noise words
    
    Why is text cleaning important?
    --------------------------------
    - ML models work better with clean, consistent text
    - Reduces vocabulary size (fewer unique words to learn)
    - Removes noise that doesn't help classification
    
    Example:
    --------
    Input:  "WALMART STORE #5234 - PURCHASE 01/15/2024"
    Output: "walmart store purchase"
    
    Parameters:
    -----------
    text : str
        Raw transaction description
    
    Returns:
    --------
    str
        Cleaned and normalized text
    """
    # Step 1: Convert to lowercase
    # Why? "WALMART" and "walmart" should be treated the same
    text = text.lower()
    
    # Step 2: Remove URLs (if any)
    # Pattern: http:// or https:// followed by characters
    text = re.sub(r'http\S+|www\S+', '', text)
    
    # Step 3: Remove email addresses
    text = re.sub(r'\S+@\S+', '', text)
    
    # Step 4: Remove numbers and dates
    # Why? "Store #5234" and "Store #9876" should both just be "Store"
    # Dates like "01/15/2024" don't help identify category
    text = re.sub(r'\d+[/-]\d+[/-]\d+', '', text)  # Remove dates
    text = re.sub(r'\d+', '', text)  # Remove all numbers
    
    # Step 5: Remove special characters and punctuation
    # Keep only letters and spaces
    text = re.sub(f'[{re.escape(string.punctuation)}]', ' ', text)
    
    # Step 6: Remove common banking noise words
    # These words appear frequently but don't help classification
    noise_words = [
        'purchase', 'payment', 'transaction', 'debit', 'credit',
        'pos', 'card', 'online', 'mobile', 'recurring', 'automatic',
        'withdrawal', 'deposit', 'transfer', 'bill', 'subscription'
    ]
    
    # Split text into words, remove noise words, rejoin
    words = text.split()
    words = [w for w in words if w not in noise_words]
    text = ' '.join(words)
    
    # Step 7: Remove extra whitespace
    # Replace multiple spaces with single space
    text = re.sub(r'\s+', ' ', text)
    
    # Step 8: Strip leading/trailing whitespace
    text = text.strip()
    
    return text


def preprocess_descriptions(descriptions: List[str]) -> List[str]:
    """
    Preprocess a batch of transaction descriptions.
    
    This is a wrapper around clean_text() that handles lists.
    
    Parameters:
    -----------
    descriptions : List[str]
        List of raw transaction descriptions
    
    Returns:
    --------
    List[str]
        List of cleaned descriptions
    
    Example:
    --------
    Input:  ["WALMART #5234", "Netflix Subscription", "Shell Gas Station"]
    Output: ["walmart", "netflix", "shell gas station"]
    """
    return [clean_text(desc) for desc in descriptions]


# ============================================================================
# CATEGORY MAPPING
# ============================================================================

# Define a mapping of prediction labels to standardized categories
# This ensures consistency even if the model learns slightly different labels
CATEGORY_MAP = {
    'food': 'Food',
    'groceries': 'Food',
    'restaurant': 'Food',
    'dining': 'Food',
    'transportation': 'Transportation',
    'transport': 'Transportation',
    'gas': 'Transportation',
    'fuel': 'Transportation',
    'uber': 'Transportation',
    'lyft': 'Transportation',
    'entertainment': 'Entertainment',
    'movie': 'Entertainment',
    'streaming': 'Entertainment',
    'gaming': 'Entertainment',
    'shopping': 'Shopping',
    'retail': 'Shopping',
    'bills': 'Bills',
    'utilities': 'Bills',
    'utility': 'Bills',
    'income': 'Income',
    'salary': 'Income',
    'paycheck': 'Income',
    'travel': 'Travel',
    'hotel': 'Travel',
    'flight': 'Travel',
    'airline': 'Travel',
    'transfer': 'Transfer',
    'atm': 'Transfer',
    'insurance': 'Insurance',
    'investment': 'Investment',
    'stocks': 'Investment',
    'retirement': 'Investment',
}


def standardize_category(category: str) -> str:
    """
    Standardize a predicted category label.
    
    What does this do?
    ------------------
    Takes a category prediction from the model and maps it to a
    standardized category that the backend expects.
    
    Why is this needed?
    -------------------
    - The model might predict "groceries" but we want "Food"
    - Ensures consistency across different model versions
    - Provides fallback for unknown categories
    
    Parameters:
    -----------
    category : str
        Raw category prediction from model
    
    Returns:
    --------
    str
        Standardized category label
    
    Example:
    --------
    Input:  "groceries"
    Output: "Food"
    """
    # Convert to lowercase for matching
    category_lower = category.lower().strip()
    
    # Look up in mapping dictionary
    # .get() returns the mapped value if found, otherwise returns the original
    standardized = CATEGORY_MAP.get(category_lower, category)
    
    # Capitalize first letter for consistency
    # "food" -> "Food"
    return standardized.capitalize() if standardized else "Other"


def map_predictions_to_categories(predictions: np.ndarray, 
                                   label_encoder: Any) -> List[str]:
    """
    Convert model predictions to category labels.
    
    How ML predictions work:
    ------------------------
    1. Model outputs numbers (e.g., 0, 1, 2, 3...)
    2. These numbers correspond to categories (0=Food, 1=Transportation, etc.)
    3. We use a label encoder to convert numbers back to text
    
    Parameters:
    -----------
    predictions : np.ndarray
        Numeric predictions from ML model
    label_encoder : LabelEncoder or similar
        Encoder that maps numbers to category names
    
    Returns:
    --------
    List[str]
        List of standardized category names
    
    Example:
    --------
    Input:  [0, 1, 0, 2]  (where 0=Food, 1=Transportation, 2=Bills)
    Output: ["Food", "Transportation", "Food", "Bills"]
    """
    # Convert numeric predictions to category names
    raw_categories = label_encoder.inverse_transform(predictions)
    
    # Standardize each category
    return [standardize_category(cat) for cat in raw_categories]


# ============================================================================
# ANOMALY DETECTION HELPERS
# ============================================================================

def detect_amount_anomalies(transactions: List[Dict[str, Any]], 
                           contamination: float = 0.05) -> List[Dict[str, Any]]:
    """
    Detect anomalous transaction amounts using statistical methods.
    
    What is anomaly detection?
    ---------------------------
    Identifying transactions that are unusual or suspicious.
    For example: A $5000 grocery purchase when typical is $100.
    
    How does this work?
    -------------------
    1. Group transactions by category (Food, Bills, etc.)
    2. Calculate statistics for each category (mean, std deviation)
    3. Flag transactions that are far from the typical range
    4. Use z-score: how many standard deviations from mean
    
    Z-score formula: (value - mean) / std_deviation
    - Z-score > 3: Very unusual (99.7% of data is within 3 std devs)
    - Z-score > 2: Somewhat unusual (95% within 2 std devs)
    
    Parameters:
    -----------
    transactions : List[Dict[str, Any]]
        List of transaction dictionaries with 'amount' and 'category'
    contamination : float
        Expected proportion of anomalies (default: 5%)
    
    Returns:
    --------
    List[Dict[str, Any]]
        List of detected anomalies with details
    
    Example:
    --------
    Input:  [
        {"amount": 50, "category": "Food"},
        {"amount": 60, "category": "Food"},
        {"amount": 5000, "category": "Food"}  # Anomaly!
    ]
    Output: [
        {
            "index": 2,
            "score": 0.95,
            "reason": "Unusually high amount for Food category"
        }
    ]
    """
    if len(transactions) < 5:
        # Need at least 5 transactions for meaningful statistics
        return []
    
    # Convert to DataFrame for easier analysis
    df = pd.DataFrame(transactions)
    
    # Ensure required columns exist
    if 'amount' not in df.columns or 'category' not in df.columns:
        return []
    
    anomalies = []
    
    # Group by category and detect anomalies within each group
    for category, group in df.groupby('category'):
        if len(group) < 3:
            # Skip categories with too few transactions
            continue
        
        # Calculate statistics for this category
        mean_amount = group['amount'].mean()
        std_amount = group['amount'].std()
        
        # Skip if standard deviation is 0 (all amounts are the same)
        if std_amount == 0:
            continue
        
        # Calculate z-scores for each transaction in this category
        # Z-score = (value - mean) / std_deviation
        group['z_score'] = (group['amount'] - mean_amount) / std_amount
        
        # Flag transactions with high z-scores (unusual amounts)
        # Threshold: z-score > 2.5 (approximately top 1% of data)
        unusual = group[group['z_score'].abs() > 2.5]
        
        for idx, row in unusual.iterrows():
            # Calculate anomaly score (normalized to 0-1 range)
            # Higher z-score = higher anomaly score
            score = min(abs(row['z_score']) / 5.0, 1.0)
            
            # Generate human-readable explanation
            if row['z_score'] > 0:
                reason = f"Unusually high amount (${row['amount']:.2f}) for {category} category (typical: ${mean_amount:.2f})"
            else:
                reason = f"Unusually low amount (${row['amount']:.2f}) for {category} category (typical: ${mean_amount:.2f})"
            
            anomalies.append({
                'index': int(idx),
                'score': float(score),
                'reason': reason
            })
    
    # Sort by score (most anomalous first)
    anomalies.sort(key=lambda x: x['score'], reverse=True)
    
    # Limit to top anomalies based on contamination rate
    max_anomalies = max(1, int(len(transactions) * contamination))
    return anomalies[:max_anomalies]


def extract_features(description: str, amount: float, txn_type: str) -> Dict[str, Any]:
    """
    Extract additional features from transaction data.
    
    Feature engineering means creating new features from existing data
    that might help the model make better predictions.
    
    What features do we extract?
    -----------------------------
    - Word count in description
    - Average word length
    - Contains numbers (yes/no)
    - Amount range (bucketed)
    - Transaction type
    
    These features can be used for more sophisticated models.
    
    Parameters:
    -----------
    description : str
        Transaction description
    amount : float
        Transaction amount
    txn_type : str
        DEBIT or CREDIT
    
    Returns:
    --------
    Dict[str, Any]
        Dictionary of extracted features
    """
    features = {}
    
    # Text features
    words = description.split()
    features['word_count'] = len(words)
    features['avg_word_length'] = sum(len(w) for w in words) / len(words) if words else 0
    features['has_numbers'] = any(char.isdigit() for char in description)
    
    # Amount features (bucketed ranges)
    if amount < 10:
        features['amount_range'] = 'micro'  # Small purchases
    elif amount < 50:
        features['amount_range'] = 'small'
    elif amount < 200:
        features['amount_range'] = 'medium'
    elif amount < 1000:
        features['amount_range'] = 'large'
    else:
        features['amount_range'] = 'xlarge'  # Major purchases
    
    # Transaction type
    features['is_debit'] = txn_type == 'DEBIT'
    
    return features


def calculate_confidence_threshold(probabilities: np.ndarray, 
                                   min_threshold: float = 0.3) -> np.ndarray:
    """
    Apply confidence threshold to predictions.
    
    What is confidence?
    -------------------
    The model outputs probabilities for each category.
    Confidence is the highest probability.
    
    Example:
    - Food: 0.95, Transportation: 0.03, Bills: 0.02
    - Confidence = 0.95 (highest probability)
    
    Why use a threshold?
    --------------------
    If confidence is too low, the model is guessing.
    We can flag low-confidence predictions for manual review.
    
    Parameters:
    -----------
    probabilities : np.ndarray
        Probability matrix from model (shape: n_samples x n_classes)
    min_threshold : float
        Minimum acceptable confidence (default: 0.3)
    
    Returns:
    --------
    np.ndarray
        Boolean mask: True if confidence is above threshold
    """
    # Get maximum probability for each prediction
    max_probs = probabilities.max(axis=1)
    
    # Return mask: True where confidence >= threshold
    return max_probs >= min_threshold


# ============================================================================
# VALIDATION HELPERS
# ============================================================================

def validate_transaction_data(transactions: List[Dict[str, Any]]) -> bool:
    """
    Validate transaction data structure.
    
    Checks that all required fields are present and valid.
    
    Parameters:
    -----------
    transactions : List[Dict[str, Any]]
        List of transaction dictionaries
    
    Returns:
    --------
    bool
        True if valid, False otherwise
    """
    required_fields = {'description', 'amount', 'date', 'type'}
    
    for txn in transactions:
        # Check all required fields exist
        if not all(field in txn for field in required_fields):
            return False
        
        # Validate data types
        if not isinstance(txn['description'], str):
            return False
        if not isinstance(txn['amount'], (int, float)):
            return False
        if txn['amount'] <= 0:
            return False
        if txn['type'] not in ['DEBIT', 'CREDIT']:
            return False
    
    return True
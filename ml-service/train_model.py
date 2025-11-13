"""
ML Model Training Script
=========================

This script trains a machine learning model to classify bank transactions
into categories based on their descriptions.

What does this script do?
--------------------------
1. Load training data from transactions_train.csv
2. Preprocess text (clean and normalize descriptions)
3. Split data into training and test sets
4. Train a TF-IDF + Logistic Regression pipeline
5. Evaluate model performance
6. Save trained model to disk (model.joblib)

How to run:
-----------
    python train_model.py

Output:
-------
- model.joblib: Trained ML model (can be loaded in app.py)
- Console output: Training metrics and evaluation results

ML Concepts Explained:
----------------------

1. TF-IDF (Term Frequency-Inverse Document Frequency):
   - Converts text to numbers that ML models can understand
   - Gives higher weight to important words, lower to common words
   - Example: "walmart" appears in many Food transactions → high TF-IDF
   
2. Logistic Regression:
   - A classification algorithm (not regression despite the name!)
   - Learns patterns to predict categories
   - Fast, interpretable, works well for text classification
   
3. Pipeline:
   - Chains multiple steps together (TF-IDF → Classifier)
   - Ensures preprocessing is applied consistently
   - Makes predictions easier (just call pipeline.predict())
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import joblib
import re
import string
# Note: NLTK is optional. We avoid importing it at module import time to prevent
# ModuleNotFoundError in environments where it's not installed. If available,
# we'll import it lazily inside preprocessing.

# ============================================================================
# CONFIGURATION
# ============================================================================

# File paths
TRAIN_DATA_PATH = 'transactions_train.csv'
MODEL_OUTPUT_PATH = 'model.joblib'

# Enhanced hyperparameters
MAX_FEATURES = 10000  # Increased vocabulary size
MIN_DF = 1
MAX_DF = 0.95
NGRAM_RANGE = (1, 2)  # Unigrams and bigrams

# Logistic Regression with balanced class weights
MAX_ITER = 1000
RANDOM_STATE = 42
TEST_SIZE = 0.2

# ============================================================================
# ENHANCED TEXT PREPROCESSING
# ============================================================================

def enhanced_clean_text(text: str) -> str:
    """
    Enhanced text cleaning with lemmatization and selective stopword removal
    """
    if not isinstance(text, str):
        return ""
    
    # Lowercase
    text = text.lower()
    
    # Remove URLs and emails
    text = re.sub(r'http\S+|www\S+|\S+@\S+', '', text)
    
    # Remove dates and transaction IDs
    text = re.sub(r'\d+[/-]\d+[/-]\d+', '', text)
    text = re.sub(r'#\d+', '', text)
    
    # Remove special chars but keep spaces
    text = re.sub(f'[{re.escape(string.punctuation)}]', ' ', text)
    
    # Remove generic banking terms (but keep business names)
    generic_terms = [
        'purchase', 'payment', 'transaction', 'pos', 'card', 
        'online', 'mobile', 'recurring', 'automatic', 'withdrawal', 
        'deposit', 'bill', 'subscription', 'store', 'number'
    ]
    
    words = text.split()
    
    # Initialize lemmatizer and stopwords
    try:
        # Lazy import to avoid hard dependency
        from nltk.corpus import stopwords  # type: ignore
        from nltk.stem import WordNetLemmatizer  # type: ignore
        lemmatizer = WordNetLemmatizer()
        stop_words = set(stopwords.words('english'))
        # Keep important business keywords
        keep_words = {'netflix', 'spotify', 'uber', 'lyft', 'walmart', 'costco', 
                     'amazon', 'chipotle', 'starbucks', 'verizon', 'comcast',
                     'bluecross', 'fidelity', 'airbnb', 'salary', 'paycheck',
                     'dividend', 'interest', 'refund', 'insurance', 'premium',
                     'rent', 'mortgage', 'airline', 'flight', 'hotel'}
        stop_words = stop_words - keep_words
    except:
        lemmatizer = None
        stop_words = set()
    
    # Clean and lemmatize
    cleaned_words = []
    for word in words:
        word = word.strip()
        if len(word) >= 2 and word not in generic_terms:
            if word not in stop_words or word in keep_words:
                if lemmatizer:
                    word = lemmatizer.lemmatize(word)
                cleaned_words.append(word)
    
    text = ' '.join(cleaned_words)
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text


def preprocess_descriptions(descriptions):
    """Batch preprocess descriptions"""
    return [enhanced_clean_text(desc) for desc in descriptions]


# ============================================================================
# LOAD AND EXPLORE DATA
# ============================================================================

def load_training_data(filepath: str) -> pd.DataFrame:
    """Load training data from CSV"""
    print(f"\n{'='*60}")
    print(f"📂 Loading training data from {filepath}...")
    print(f"{'='*60}")
    
    try:
        df = pd.read_csv(filepath)
        print(f"✅ Loaded {len(df)} transactions")
        print(f"📊 Columns: {list(df.columns)}")
        
        # Validate required columns
        required = ['description', 'category']
        if not all(col in df.columns for col in required):
            print(f"❌ Error: Missing required columns. Need: {required}")
            return None
        
        return df
    except FileNotFoundError:
        print(f"❌ Error: File not found: {filepath}")
        return None
    except Exception as e:
        print(f"❌ Error loading data: {e}")
        return None


def explore_data(df: pd.DataFrame):
    """Print data statistics"""
    print(f"\n{'='*60}")
    print("📊 DATA EXPLORATION")
    print(f"{'='*60}")
    
    # Basic info
    print(f"Total transactions: {len(df)}")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
    
    # Category distribution
    print(f"\n📁 Category distribution:")
    category_counts = df['category'].value_counts()
    for category, count in category_counts.items():
        percentage = (count / len(df)) * 100
        print(f"  {category:15s}: {count:4d} ({percentage:5.1f}%)")
    
    # Check for missing values
    missing = df.isnull().sum()
    if missing.any():
        print(f"\n⚠️  Missing values:")
        print(missing[missing > 0])
    else:
        print(f"\n✅ No missing values")
    
    # Sample transactions
    print(f"\n🔍 Sample transactions:")
    for idx, row in df.head(3).iterrows():
        print(f"  {row['description'][:40]:40s} → {row['category']}")


# ============================================================================
# STEP 2: PREPROCESS DATA
# ============================================================================

def preprocess_training_data(df: pd.DataFrame) -> tuple:
    """
    Preprocess data for ML model training.
    
    Steps:
    ------
    1. Extract features (X) and labels (y)
    2. Clean text descriptions
    3. Encode category labels to numbers
    
    Why encode labels?
    ------------------
    ML models work with numbers, not text.
    We convert "Food" → 0, "Transportation" → 1, etc.
    We save the encoder so we can convert back later.
    
    Parameters:
    -----------
    df : pd.DataFrame
        Raw training data
    
    Returns:
    --------
    tuple
        (X, y, label_encoder)
        - X: List of cleaned descriptions
        - y: Numeric category labels
        - label_encoder: LabelEncoder object (for converting back)
    """
    print("\n" + "="*60)
    print("🧹 PREPROCESSING DATA")
    print("="*60)
    
    # Extract descriptions and categories
    descriptions = df['description'].tolist()
    categories = df['category'].tolist()
    
    # Clean text descriptions
    print("📝 Cleaning text descriptions...")
    cleaned_descriptions = preprocess_descriptions(descriptions)
    
    # Show before/after examples
    print("\n🔍 Cleaning examples:")
    for i in range(min(3, len(descriptions))):
        print(f"  Before: {descriptions[i][:50]}")
        print(f"  After:  {cleaned_descriptions[i][:50]}")
        print()
    
    # Encode category labels to numbers
    # LabelEncoder converts ["Food", "Bills", "Food"] → [0, 1, 0]
    print("🔢 Encoding category labels...")
    label_encoder = LabelEncoder()
    encoded_labels = label_encoder.fit_transform(categories)
    
    print(f"✅ Encoded {len(label_encoder.classes_)} unique categories:")
    for idx, category in enumerate(label_encoder.classes_):
        print(f"  {idx} → {category}")
    
    return cleaned_descriptions, encoded_labels, label_encoder


# ============================================================================
# STEP 3: BUILD AND TRAIN MODEL
# ============================================================================

def build_model_pipeline() -> Pipeline:
    """Build enhanced ML pipeline"""
    print(f"\n{'='*60}")
    print("🏗️  BUILDING ENHANCED MODEL PIPELINE")
    print(f"{'='*60}")
    
    # Step 1: TF-IDF Vectorizer
    # This converts text to numerical features
    print("📊 Configuring TF-IDF Vectorizer:")
    print(f"  - Max features: {MAX_FEATURES}")
    print(f"  - N-gram range: {NGRAM_RANGE} (use word pairs)")
    print(f"  - Min document frequency: {MIN_DF}")
    print(f"  - Max document frequency: {MAX_DF}")
    
    vectorizer = TfidfVectorizer(
        max_features=MAX_FEATURES,
        ngram_range=NGRAM_RANGE,
        min_df=MIN_DF,
        max_df=MAX_DF,
        strip_accents='unicode',
        lowercase=True,
        stop_words='english',
        token_pattern=r'\b[a-zA-Z]{2,}\b'
    )
    
    print(f"\n🤖 Logistic Regression Configuration:")
    print(f"  - Class weight: balanced (handles imbalanced data)")
    print(f"  - Max iterations: {MAX_ITER}")
    print(f"  - Solver: lbfgs")
    
    classifier = LogisticRegression(
        max_iter=MAX_ITER,
        C=1.0,
        solver='lbfgs',
        multi_class='multinomial',
        class_weight='balanced',  # KEY: Handles imbalanced classes
        random_state=RANDOM_STATE
    )
    
    # Create pipeline
    pipeline = Pipeline([
        ('tfidf', vectorizer),
        ('classifier', classifier)
    ])
    
    print("\n✅ Pipeline created successfully!")
    return pipeline


def train_model_with_cv(pipeline: Pipeline, X_train, y_train):
    """Train model with optional grid search"""
    print(f"\n{'='*60}")
    print("🎓 TRAINING MODEL")
    print(f"{'='*60}")
    
    print(f"📚 Training on {len(X_train)} transactions...")
    print("⏳ This may take a moment...")
    
    # Simple training (grid search can be added if needed)
    pipeline.fit(X_train, y_train)
    
    print("✅ Training completed!")
    return pipeline


def evaluate_model(pipeline, X_test, y_test, label_encoder):
    """Evaluate model with detailed metrics"""
    print(f"\n{'='*60}")
    print("📊 EVALUATING MODEL PERFORMANCE")
    print("="*60)
    
    # Make predictions on test data
    print("🔮 Making predictions on test set...")
    y_pred = pipeline.predict(X_test)
    
    # Calculate accuracy
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n🎯 Overall Accuracy: {accuracy:.2%}")
    print(f"   (Model correctly predicted {accuracy:.0%} of test transactions)")
    
    # Detailed classification report
    # Shows precision, recall, F1 for each category
    print("\n📈 Detailed Classification Report:")
    print("="*60)
    target_names = label_encoder.classes_
    report = classification_report(y_test, y_pred, target_names=target_names)
    print(report)
    
    # Confusion matrix
    # Shows which categories get confused with each other
    print("\n🔀 Confusion Matrix:")
    print("   (Rows = True category, Columns = Predicted category)")
    cm = confusion_matrix(y_test, y_pred)
    
    # Print confusion matrix with labels
    print("\n   " + "  ".join(f"{cat[:4]:>4s}" for cat in target_names))
    for i, row in enumerate(cm):
        print(f"{target_names[i][:12]:12s}", "  ".join(f"{val:4d}" for val in row))
    
    # Sample predictions
    print(f"\n🔍 Sample Predictions:")
    print("="*60)
    for i in range(min(10, len(X_test))):
        true_cat = label_encoder.inverse_transform([y_test[i]])[0]
        pred_cat = label_encoder.inverse_transform([y_pred[i]])[0]
        correct = "✓" if true_cat == pred_cat else "✗"
        proba = pipeline.predict_proba([X_test[i]])[0].max()
        print(f"{correct} '{X_test[i][:40]:40s}' → {pred_cat:15s} (confidence: {proba:.2f}, true: {true_cat})")


def save_model(pipeline, label_encoder, filepath: str):
    """Save trained model"""
    print(f"\n{'='*60}")
    print("💾 SAVING MODEL")
    print("="*60)
    
    print(f"📦 Saving model to {filepath}...")
    
    # Bundle everything together
    model_bundle = {
        'pipeline': pipeline,
        'label_encoder': label_encoder,
        'categories': label_encoder.classes_.tolist(),
        'version': '2.0.0',
        'features': {
            'max_features': MAX_FEATURES,
            'ngram_range': NGRAM_RANGE,
            'class_weight': 'balanced'
        }
    }
    
    # Save to disk
    # compress=3: Good balance between compression and speed
    joblib.dump(model_bundle, filepath, compress=3)
    
    import os
    file_size = os.path.getsize(filepath) / 1024
    print(f"✅ Model saved! (Size: {file_size:.1f} KB)")


# ============================================================================
# MAIN TRAINING FUNCTION
# ============================================================================

def main():
    print(f"\n{'='*60}")
    print("🚀 ENHANCED MODEL TRAINING")
    print(f"{'='*60}")
    
    # Load data
    df = load_training_data(TRAIN_DATA_PATH)
    if df is None:
        return
    
    explore_data(df)
    
    # Preprocess
    print(f"\n{'='*60}")
    print("🧹 PREPROCESSING DATA")
    print(f"{'='*60}")
    
    descriptions = df['description'].tolist()
    categories = df['category'].tolist()
    
    print("📝 Cleaning text descriptions...")
    cleaned_descriptions = preprocess_descriptions(descriptions)
    
    print("\n🔍 Cleaning examples:")
    for i in range(min(3, len(descriptions))):
        print(f"  Before: {descriptions[i][:50]}")
        print(f"  After:  {cleaned_descriptions[i][:50]}\n")
    
    # Encode labels
    print("🔢 Encoding category labels...")
    label_encoder = LabelEncoder()
    encoded_labels = label_encoder.fit_transform(categories)
    
    print(f"✅ Encoded {len(label_encoder.classes_)} categories:")
    for idx, cat in enumerate(label_encoder.classes_):
        print(f"  {idx} → {cat}")
    
    # Split data
    print(f"\n{'='*60}")
    print("✂️  SPLITTING DATA")
    print(f"{'='*60}")
    
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            cleaned_descriptions, encoded_labels,
            test_size=TEST_SIZE,
            random_state=RANDOM_STATE,
            stratify=encoded_labels
        )
        print(f"✅ Training: {len(X_train)} | Test: {len(X_test)}")
        do_evaluate = True
    except ValueError:
        print("⚠️  Dataset too small for split, using full dataset")
        X_train, y_train = cleaned_descriptions, encoded_labels
        X_test, y_test = [], []
        do_evaluate = False
    
    # Build and train
    pipeline = build_model_pipeline()
    pipeline = train_model_with_cv(pipeline, X_train, y_train)
    
    # Evaluate
    if do_evaluate and len(X_test) > 0:
        evaluate_model(pipeline, X_test, y_test, label_encoder)
    
    # Save
    save_model(pipeline, label_encoder, MODEL_OUTPUT_PATH)
    
    print(f"\n{'='*60}")
    print("🎉 TRAINING COMPLETED!")
    print(f"{'='*60}")
    print(f"✅ Model: {MODEL_OUTPUT_PATH}")
    print(f"✅ Ready for production use!")


if __name__ == "__main__":
    main()
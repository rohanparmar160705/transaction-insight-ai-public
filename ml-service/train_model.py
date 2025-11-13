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
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import joblib
import os
import sys

# Import our custom utilities
from utils import clean_text, preprocess_descriptions


# ============================================================================
# CONFIGURATION
# ============================================================================

# File paths
TRAIN_DATA_PATH = 'transactions_train.csv'
MODEL_OUTPUT_PATH = 'model.joblib'

# Model hyperparameters
# These control how the model learns

# TF-IDF parameters:
MAX_FEATURES = 5000  # Maximum number of unique words to consider
MIN_DF = 1  # Minimum documents a word must appear in (1 = include all words)
MAX_DF = 0.95  # Maximum document frequency (0.95 = exclude words in >95% of docs)
NGRAM_RANGE = (1, 2)  # Use both single words and pairs of words

# Logistic Regression parameters:
MAX_ITER = 1000  # Maximum training iterations
C = 1.0  # Regularization strength (lower = more regularization)
RANDOM_STATE = 42  # For reproducibility

# Train/test split
TEST_SIZE = 0.2  # 20% of data for testing, 80% for training


# ============================================================================
# STEP 1: LOAD AND EXPLORE DATA
# ============================================================================

def load_training_data(filepath: str) -> pd.DataFrame:
    """
    Load training data from CSV file.
    
    The CSV should have columns:
    - date: Transaction date
    - description: Transaction description (what we'll train on)
    - amount: Transaction amount
    - type: DEBIT or CREDIT
    - category: Target label (what we want to predict)
    
    Parameters:
    -----------
    filepath : str
        Path to CSV file
    
    Returns:
    --------
    pd.DataFrame
        Loaded data
    """
    print(f"📂 Loading training data from {filepath}...")
    
    # Check if file exists
    if not os.path.exists(filepath):
        print(f"❌ Error: File not found: {filepath}")
        sys.exit(1)
    
    # Load CSV into DataFrame
    # Pandas automatically detects column types
    df = pd.read_csv(filepath)
    
    print(f"✅ Loaded {len(df)} transactions")
    print(f"📊 Columns: {list(df.columns)}")
    
    return df


def explore_data(df: pd.DataFrame):
    """
    Print basic statistics about the training data.
    
    This helps us understand:
    - How many transactions we have
    - How many categories
    - If data is balanced (equal examples per category)
    """
    print("\n" + "="*60)
    print("📊 DATA EXPLORATION")
    print("="*60)
    
    # Basic info
    print(f"Total transactions: {len(df)}")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
    
    # Category distribution
    print(f"\n📁 Category distribution:")
    category_counts = df['category'].value_counts()
    for category, count in category_counts.items():
        percentage = (count / len(df)) * 100
        print(f"  {category:15s}: {count:3d} ({percentage:5.1f}%)")
    
    # Check for missing values
    missing = df.isnull().sum()
    if missing.any():
        print(f"\n⚠️  Warning: Missing values detected:")
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
    """
    Build ML pipeline with TF-IDF vectorizer and classifier.
    
    What is a Pipeline?
    -------------------
    A pipeline chains multiple processing steps:
    1. TfidfVectorizer: Converts text → numbers
    2. LogisticRegression: Learns patterns to predict category
    
    Benefits:
    - Cleaner code (one object does everything)
    - Prevents data leakage (ensures test data isn't seen during training)
    - Easier to save/load (save once, get all steps)
    
    Returns:
    --------
    Pipeline
        Sklearn pipeline ready for training
    """
    print("\n" + "="*60)
    print("🏗️  BUILDING MODEL PIPELINE")
    print("="*60)
    
    # Step 1: TF-IDF Vectorizer
    # This converts text to numerical features
    print("📊 Configuring TF-IDF Vectorizer:")
    print(f"  - Max features: {MAX_FEATURES}")
    print(f"  - N-gram range: {NGRAM_RANGE} (use word pairs)")
    print(f"  - Min document frequency: {MIN_DF}")
    print(f"  - Max document frequency: {MAX_DF}")
    
    vectorizer = TfidfVectorizer(
        max_features=MAX_FEATURES,
        ngram_range=NGRAM_RANGE,  # Use both 1-word and 2-word phrases
        min_df=MIN_DF,
        max_df=MAX_DF,
        strip_accents='unicode',
        lowercase=True,
        token_pattern=r'\b[a-zA-Z]{2,}\b'  # Only keep words with 2+ letters
    )
    
    # Step 2: Logistic Regression Classifier
    print("\n🤖 Configuring Logistic Regression:")
    print(f"  - Max iterations: {MAX_ITER}")
    print(f"  - Regularization (C): {C}")
    print(f"  - Solver: lbfgs (good for small datasets)")
    
    classifier = LogisticRegression(
        max_iter=MAX_ITER,
        C=C,
        solver='lbfgs',  # Optimization algorithm
        multi_class='multinomial',  # For multiple categories
        random_state=RANDOM_STATE
    )
    
    # Create pipeline
    pipeline = Pipeline([
        ('tfidf', vectorizer),
        ('classifier', classifier)
    ])
    
    print("\n✅ Pipeline created successfully!")
    return pipeline


def train_model(pipeline: Pipeline, X_train: list, y_train: np.ndarray):
    """
    Train the ML model on training data.
    
    What happens during training?
    ------------------------------
    1. TF-IDF learns vocabulary from training descriptions
    2. Classifier learns patterns: which words → which categories
    3. Model adjusts weights to minimize prediction errors
    
    This can take a few seconds to minutes depending on data size.
    
    Parameters:
    -----------
    pipeline : Pipeline
        Untrained model pipeline
    X_train : list
        Training descriptions (cleaned text)
    y_train : np.ndarray
        Training labels (encoded categories)
    """
    print("\n" + "="*60)
    print("🎓 TRAINING MODEL")
    print("="*60)
    
    print(f"📚 Training on {len(X_train)} transactions...")
    print("⏳ This may take a moment...")
    
    # Train the model
    # .fit() is where the actual learning happens
    pipeline.fit(X_train, y_train)
    
    print("✅ Training completed!")


# ============================================================================
# STEP 4: EVALUATE MODEL
# ============================================================================

def evaluate_model(pipeline: Pipeline, 
                  X_test: list, 
                  y_test: np.ndarray, 
                  label_encoder: LabelEncoder):
    """
    Evaluate model performance on test data.
    
    Why evaluate on test data?
    ---------------------------
    We need to see how the model performs on NEW data it hasn't seen.
    Training accuracy can be misleading (model might just memorize).
    
    Metrics explained:
    ------------------
    - Accuracy: % of correct predictions (e.g., 0.85 = 85% correct)
    - Precision: Of predictions for a category, how many were correct?
    - Recall: Of all actual transactions in a category, how many did we find?
    - F1-score: Harmonic mean of precision and recall (balanced metric)
    
    Parameters:
    -----------
    pipeline : Pipeline
        Trained model
    X_test : list
        Test descriptions
    y_test : np.ndarray
        True test labels
    label_encoder : LabelEncoder
        For converting numbers back to category names
    """
    print("\n" + "="*60)
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
    
    # Show some example predictions
    print("\n🔍 Sample Predictions:")
    print("="*60)
    for i in range(min(5, len(X_test))):
        true_cat = label_encoder.inverse_transform([y_test[i]])[0]
        pred_cat = label_encoder.inverse_transform([y_pred[i]])[0]
        correct = "✓" if true_cat == pred_cat else "✗"
        print(f"{correct} '{X_test[i][:40]:40s}' → Predicted: {pred_cat:15s} (True: {true_cat})")


# ============================================================================
# STEP 5: SAVE MODEL
# ============================================================================

def save_model(pipeline: Pipeline, label_encoder: LabelEncoder, filepath: str):
    """
    Save trained model to disk.
    
    What gets saved?
    ----------------
    - The entire pipeline (TF-IDF + Classifier)
    - The label encoder (for converting numbers ↔ category names)
    
    We use joblib instead of pickle because:
    - More efficient for large numpy arrays
    - Better compression
    - Safer (less prone to security issues)
    
    Parameters:
    -----------
    pipeline : Pipeline
        Trained model pipeline
    label_encoder : LabelEncoder
        Fitted label encoder
    filepath : str
        Output file path (e.g., 'model.joblib')
    """
    print("\n" + "="*60)
    print("💾 SAVING MODEL")
    print("="*60)
    
    print(f"📦 Saving model to {filepath}...")
    
    # Bundle everything together
    model_bundle = {
        'pipeline': pipeline,
        'label_encoder': label_encoder,
        'categories': label_encoder.classes_.tolist(),
        'version': '1.0.0',
        'features': {
            'max_features': MAX_FEATURES,
            'ngram_range': NGRAM_RANGE
        }
    }
    
    # Save to disk
    # compress=3: Good balance between compression and speed
    joblib.dump(model_bundle, filepath, compress=3)
    
    # Verify file was created
    file_size = os.path.getsize(filepath) / 1024  # Convert to KB
    print(f"✅ Model saved successfully! (Size: {file_size:.1f} KB)")
    print(f"\n📌 Model includes:")
    print(f"   - TF-IDF Vectorizer (vocabulary: {len(pipeline.named_steps['tfidf'].vocabulary_)} words)")
    print(f"   - Logistic Regression Classifier")
    print(f"   - Label Encoder ({len(label_encoder.classes_)} categories)")


# ============================================================================
# MAIN TRAINING FUNCTION
# ============================================================================

def main():
    """
    Main training workflow.
    
    Orchestrates all steps:
    1. Load data
    2. Preprocess
    3. Split train/test
    4. Build model
    5. Train
    6. Evaluate
    7. Save
    """
    print("\n" + "="*60)
    print("🚀 STARTING MODEL TRAINING")
    print("="*60)
    
    try:
        # STEP 1: Load data
        df = load_training_data(TRAIN_DATA_PATH)
        explore_data(df)
        
        # STEP 2: Preprocess
        X, y, label_encoder = preprocess_training_data(df)
        
        # STEP 3: Split data
        print("\n" + "="*60)
        print("✂️  SPLITTING DATA")
        print("="*60)
        print(f"📊 Splitting into train/test sets ({int((1-TEST_SIZE)*100)}% / {int(TEST_SIZE*100)}%)...")

        try:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y,
                test_size=TEST_SIZE,
                random_state=RANDOM_STATE,
                stratify=y  # Ensure balanced split across categories
            )
            print(f"✅ Training set: {len(X_train)} transactions")
            print(f"✅ Test set: {len(X_test)} transactions")
            do_evaluate = True
        except ValueError as e:
            # Fallback for very small datasets where stratified split is not possible
            print(f"\n⚠️  Stratified split failed: {str(e)}")
            print("➡️  Falling back to training on the full dataset without a test split.")
            X_train, y_train = X, y
            X_test, y_test = [], np.array([])
            do_evaluate = False

        # STEP 4: Build model
        pipeline = build_model_pipeline()
        
        # STEP 5: Train
        train_model(pipeline, X_train, y_train)
        
        # STEP 6: Evaluate (only if we have a valid test split)
        if do_evaluate and len(X_test) > 0:
            evaluate_model(pipeline, X_test, y_test, label_encoder)
        else:
            print("\n" + "="*60)
            print("ℹ️  Skipping evaluation due to insufficient test set.")
            print("="*60)
        
        # STEP 7: Save
        save_model(pipeline, label_encoder, MODEL_OUTPUT_PATH)
        
        print("\n" + "="*60)
        print("🎉 TRAINING COMPLETED SUCCESSFULLY!")
        print("="*60)
        print(f"\n✅ Model saved to: {MODEL_OUTPUT_PATH}")
        print(f"✅ Ready to use in app.py")
        print(f"\n🚀 Next steps:")
        print(f"   1. Start the API: python -m uvicorn app:app --reload")
        print(f"   2. Test predictions: curl -X POST http://localhost:8001/predict ...")
        
    except Exception as e:
        print(f"\n❌ Training failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


# ============================================================================
# RUN TRAINING
# ============================================================================

if __name__ == "__main__":
    main()
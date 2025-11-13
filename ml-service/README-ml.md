# Transaction Insight AI - ML Service

FastAPI-based machine learning microservice for transaction categorization and anomaly detection.

## 🎯 Features

- **Transaction Categorization**: Automatically categorize transactions using ML
- **Batch Predictions**: Process multiple transactions efficiently
- **Anomaly Detection**: Flag unusual spending patterns
- **RESTful API**: Easy integration with backend services
- **Docker Support**: Containerized deployment

## 🏗️ Architecture

### ML Pipeline
```
Transaction Description → TF-IDF Vectorizer → Logistic Regression → Category + Confidence
```

**Components:**

1. **TF-IDF Vectorizer**: Converts text descriptions into numerical features
   - Captures word importance using Term Frequency-Inverse Document Frequency
   - Uses unigrams and bigrams (1-2 word phrases)
   - Vocabulary size: 500 most important terms

2. **Logistic Regression Classifier**: Multi-class classification
   - One-vs-rest strategy
   - Balanced class weights for handling imbalanced data
   - L2 regularization to prevent overfitting

3. **Anomaly Detection**: Statistical outlier detection
   - Z-score based method for amount outliers
   - Category-specific outlier detection
   - Configurable thresholds

## 📦 Installation

### Local Development

1. **Create virtual environment:**
```bash
   cd ml-service
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
   pip install -r requirements.txt
```

3. **Create environment file:**
```bash
   cp .env.example .env
```

4. **Train the model:**
```bash
   python train_model.py
```
   
   This will:
   - Load training data from `data/transactions_train.csv`
   - Train TF-IDF vectorizer and classifier
   - Save models to `models/` directory
   - Print evaluation metrics

5. **Start the service:**
```bash
   python main.py
```
   
   Or with uvicorn directly:
```bash
   uvicorn main:app --reload --port 8000
```

6. **Access the API:**
   - API: http://localhost:8000
   - Interactive docs: http://localhost:8000/docs
   - Health check: http://localhost:8000/health

### Docker Deployment

1. **Build Docker image:**
```bash
   cd ml-service
   docker build -t transaction-ml-service .
```

2. **Run container:**
```bash
   docker run -d \
     -p 8000:8000 \
     --name ml-service \
     transaction-ml-service
```

3. **Train model in container (if not pre-trained):**
```bash
   docker exec ml-service python train_model.py
```

4. **View logs:**
```bash
   docker logs -f ml-service
```

## 🔌 API Endpoints

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "Transaction Insight ML Service",
  "timestamp": "2024-01-15T10:30:00",
  "models_loaded": true,
  "categories": 15
}
```

### Single Prediction
```http
POST /predict
Content-Type: application/json

{
  "description": "Starbucks Coffee",
  "amount": 5.75,
  "date": "2024-01-15T10:30:00",
  "type": "DEBIT"
}
```

Response:
```json
{
  "category": "Food & Dining",
  "confidence": 0.92
}
```

### Batch Prediction
```http
POST /predict-batch
Content-Type: application/json

{
  "transactions": [
    {
      "description": "Shell Gas Station",
      "amount": 45.20,
      "date": "2024-01-16",
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
```

Response:
```json
{
  "predictions": [
    {"category": "Transportation", "confidence": 0.92},
    {"category": "Entertainment", "confidence": 0.98}
  ]
}
```

### Anomaly Detection
```http
POST /detect-anomalies
Content-Type: application/json

{
  "transactions": [
    {"amount": 50, "category": "Groceries", "date": "2024-01-15"},
    {"amount": 500, "category": "Groceries", "date": "2024-01-16"},
    {"amount": 45, "category": "Groceries", "date": "2024-01-17"}
  ]
}
```

Response:
```json
{
  "anomalies": [
    {
      "index": 1,
      "score": 0.85,
      "reason": "Unusually high amount: $500.00 (avg: $65.00)"
    }
  ]
}
```

### Get Categories
```http
GET /categories
```

Response:
```json
{
  "categories": [
    "Cash & ATM",
    "Charity & Donations",
    "Education & Books",
    "Entertainment",
    "Fitness & Wellness",
    "Food & Dining",
    "Groceries",
    "Healthcare",
    "Home Improvement",
    "Housing",
    "Income",
    "Insurance",
    "Pets",
    "Shopping",
    "Transportation",
    "Travel",
    "Utilities"
  ],
  "count": 17
}
```

## 🧪 Testing

### Manual Testing with curl
```bash
# Health check
curl http://localhost:8000/health

# Single prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Walmart Grocery Store",
    "amount": 85.50,
    "date": "2024-01-15",
    "type": "DEBIT"
  }'

# Batch prediction
curl -X POST http://localhost:8000/predict-batch \
  -H "Content-Type: application/json" \
  -d '{
    "transactions": [
      {"description": "Shell Gas", "amount": 45, "date": "2024-01-16", "type": "DEBIT"},
      {"description": "Netflix", "amount": 15.99, "date": "2024-01-17", "type": "DEBIT"}
    ]
  }'
```

### Python Testing
```python
import requests

# Health check
response = requests.get("http://localhost:8000/health")
print(response.json())

# Predict
response = requests.post(
    "http://localhost:8000/predict",
    json={
        "description": "Starbucks Coffee",
        "amount": 5.75,
        "date": "2024-01-15T10:30:00",
        "type": "DEBIT"
    }
)
print(response.json())
```

## 📊 Model Training

### Training Data Format

The training data should be a CSV file with these columns:
```csv
description,category
Walmart Grocery Store,Groceries
Shell Gas Station,Transportation
Netflix Subscription,Entertainment
```

**Required columns:**
- `description`: Transaction description text
- `category`: Category label

### Adding New Categories

1. Add training examples to `data/transactions_train.csv`
2. Ensure at least 5-10 examples per category
3. Retrain the model:
```bash
   python train_model.py
```
4. Restart the service to load new models

### Model Performance

Expected performance with provided training data:
- **Accuracy**: ~85-95% (depends on training data quality)
- **Categories**: 17 different transaction categories
- **Training time**: < 1 minute
- **Prediction time**: < 10ms per transaction

## 🔧 Configuration

### Environment Variables
```env
PORT=8000                    # Service port
HOST=0.0.0.0                # Bind address
ENVIRONMENT=development      # Environment (development/production)
LOG_LEVEL=INFO              # Logging level
CORS_ORIGINS=*              # Allowed CORS origins
```

### Model Parameters

Edit `train_model.py` to adjust:
```python
# TF-IDF parameters
TfidfVectorizer(
    max_features=500,      # Vocabulary size
    ngram_range=(1, 2),    # Use unigrams and bigrams
    min_df=1               # Minimum document frequency
)

# Classifier parameters
LogisticRegression(
    max_iter=1000,         # Maximum iterations
    class_weight='balanced' # Handle imbalanced classes
)
```

## 🚀 Production Deployment

### With Gunicorn (Recommended)
```bash
gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 60
```

### With Docker Compose
```yaml
version: '3.8'
services:
  ml-service:
    build: ./ml-service
    ports:
      - "8000:8000"
    environment:
      - PORT=8000
      - LOG_LEVEL=INFO
    volumes:
      - ./ml-service/models:/app/models
    restart: unless-stopped
```

### Performance Tuning

**For high-traffic scenarios:**

1. **Increase workers**: Scale horizontally with more Gunicorn workers
```bash
   --workers $((2 * CPU_COUNT + 1))
```

2. **Model caching**: Models are loaded once at startup and kept in memory

3. **Batch predictions**: Always prefer `/predict-batch` over multiple `/predict` calls

4. **Resource limits**: Set appropriate Docker memory limits
```bash
   docker run -m 512m --cpus="1.0" ...
```

## 📈 Monitoring

### Health Checks

The `/health` endpoint provides service status:
```json
{
  "status": "healthy",
  "models_loaded": true,
  "categories": 17
}
```

### Logging

Logs include:
- Request/response info
- Prediction details
- Error traces
- Performance metrics

Access logs:
```bash
# Docker
docker logs ml-service

# Local
tail -f logs/ml-service.log
```

## 🐛 Troubleshooting

### Models Not Loading
```
Error: Models directory not found. Please run train_model.py first.
```

**Solution**: Train the model first
```bash
python train_model.py
```

### Low Prediction Accuracy

**Solutions**:
1. Add more training data
2. Balance categories (equal examples per category)
3. Tune hyperparameters in `train_model.py`
4. Try different algorithms (Random Forest, XGBoost)

### Service Not Starting

Check:
1. Port 8000 is available: `lsof -i :8000`
2. Dependencies installed: `pip install -r requirements.txt`
3. Python version: Requires Python 3.9+

## 📚 API Documentation

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔗 Integration with Backend

The Node.js backend connects to this service via `mlClient.ts`:
```typescript
// backend/src/services/mlClient.ts
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Predict categories
const response = await axios.post(`${ML_SERVICE_URL}/predict-batch`, {
  transactions: [...]
});
```

Ensure `ML_SERVICE_URL` in backend `.env` points to this service.

## 📄 License

MIT License - See main project LICENSE file

## 🤝 Contributing

1. Add training examples to improve accuracy
2. Implement new anomaly detection methods
3. Add support for additional ML models
4. Improve preprocessing pipeline

## 🆘 Support

For issues or questions:
1. Check logs: `docker logs ml-service`
2. Verify models are trained: `ls -la models/`
3. Test health endpoint: `curl http://localhost:8000/health`




Steps (run in PowerShell from ml-service folder)
Upgrade core tools
.\venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
Install dependencies
.\venv\Scripts\pip.exe install -r requirements.txt
Train the model (skip if model.joblib exists)
.\venv\Scripts\python.exe .\train_model.py
Start the FastAPI server on port 8000
.\venv\Scripts\uvicorn.exe app:app --host 0.0.0.0 --port 8000 --reload
Verify health
Invoke-RestMethod http://localhost:8000/health | ConvertTo-Json
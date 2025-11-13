# Transaction Insight AI - Backend

Node.js + TypeScript + Express + Prisma backend for Transaction Insight AI.

## 🚀 Features

- **Authentication**: JWT-based user registration and login
- **File Upload**: Support for CSV and PDF bank statements
- **ML Integration**: Automatic transaction categorization via FastAPI ML service
- **REST API**: Complete CRUD operations for transactions
- **Analytics**: Financial insights and spending patterns
- **Database**: PostgreSQL with Prisma ORM
- **Security**: Helmet, CORS, bcrypt password hashing
- **Logging**: Winston-based structured logging

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- ML Service running on port 8000

## 🛠️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/transaction_insight"
JWT_SECRET="your-super-secret-jwt-key-change-this"
ML_SERVICE_URL="http://localhost:8000"
PORT=5000
```

### 3. Initialize Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed with test data (optional)
npm run prisma:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

## 📡 API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user

### File Upload

- `POST /api/upload` - Upload CSV/PDF (requires auth)

### Transactions

- `GET /api/transactions` - List transactions (requires auth)
  - Query params: `page`, `limit`, `category`, `startDate`, `endDate`
- `GET /api/insights` - Get analytics (requires auth)
  - Query params: `startDate`, `endDate`

### Health Check

- `GET /health` - Service health status

## 🧪 Testing

Test the API with sample data:

```bash
# Register a user
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Upload file (replace TOKEN with JWT from login)
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@/path/to/statement.csv"
```

## 🐳 Docker

Build and run with Docker:

```bash
# Build image
docker build -t transaction-insight-backend .

# Run container
docker run -p 5000:5000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/transaction_insight" \
  -e JWT_SECRET="your-secret" \
  -e ML_SERVICE_URL="http://host.docker.internal:8000" \
  transaction-insight-backend
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.ts              # Server entry point
│   ├── app.ts                # Express app configuration
│   ├── prismaClient.ts       # Prisma singleton
│   ├── routes/               # API route definitions
│   ├── controllers/          # Request handlers
│   ├── middleware/           # Auth middleware
│   ├── services/             # External service clients (ML)
│   ├── utils/                # Utilities (parsers, logger)
│   └── types/                # TypeScript types
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Test data seeder
├── Dockerfile
├── package.json
└── tsconfig.json
```

## 🔧 Development Commands

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Lint code
npm run prisma:studio  # Open Prisma Studio (DB GUI)
```

## 🔐 Security Notes

- Never commit `.env` file
- Change `JWT_SECRET` in production
- Use strong passwords
- Enable HTTPS in production
- Set proper CORS origins

## 📝 Database Schema

### User
- id, email, password (hashed), name, timestamps

### Transaction
- id, userId, date, description, amount, type (DEBIT/CREDIT)
- category, predictionConfidence
- uploadId (optional)

### Upload
- id, userId, fileName, fileType, fileSize
- status, errorMessage, transactionCount

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add proper error handling
3. Write descriptive comments
4. Test all endpoints before committing
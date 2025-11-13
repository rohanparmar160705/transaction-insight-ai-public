# Transaction Insight AI - Frontend

Modern React + TypeScript + Tailwind CSS frontend for Transaction Insight AI.

## 🚀 Features

- **Authentication**: JWT-based login/signup with secure token management
- **File Upload**: Drag-and-drop CSV/PDF upload with progress tracking
- **Dashboard**: Paginated transaction list with sorting and filters
- **Insights**: Interactive charts and financial analytics
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS
- **Type Safety**: Full TypeScript support
- **Modern Stack**: React 18, Vite, React Router, Recharts

---

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running on `http://localhost:5000`
- ML Service running on `http://localhost:8001`

---

## 🛠️ Setup & Installation

### 1️⃣ Install Dependencies

```bash
cd frontend
npm install
```

### 2️⃣ Configure Environment Variables

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3️⃣ Start Development Server

```bash
npm run dev
```

Frontend runs on **http://localhost:5173**

---

## 📦 Build for Production

```bash
npm run build
```

Output: `dist/` directory with optimized static files

Preview production build:

```bash
npm run preview
```

---

## 🐳 Docker Deployment

### Build Docker Image

```bash
docker build -t transaction-frontend .
```

### Run Container

```bash
docker run -p 3000:80 transaction-frontend
```

Access at **http://localhost:3000**

### Run with Custom API URL

```bash
docker run -p 3000:80 \
  -e VITE_API_URL=http://api.example.com/api \
  transaction-frontend
```

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Root component with routing
│   ├── styles.css            # Global styles (Tailwind)
│   ├── api/
│   │   └── api.ts            # API client with JWT handling
│   ├── components/
│   │   ├── Navbar.tsx        # Navigation bar
│   │   ├── ProtectedRoute.tsx # Auth guard
│   │   ├── TransactionTable.tsx # Transaction table
│   │   └── Charts.tsx        # Recharts components
│   └── pages/
│       ├── LoginPage.tsx     # Login form
│       ├── SignupPage.tsx    # Registration form
│       ├── UploadPage.tsx    # File upload
│       ├── Dashboard.tsx     # Transaction list
│       └── InsightsPage.tsx  # Analytics dashboard
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── Dockerfile
└── README-frontend.md
```

---

## 🔑 Key Features Explained

### Authentication Flow

1. User logs in via `/login`
2. Backend returns JWT token
3. Token stored in `localStorage` with expiry
4. API client automatically injects token in `Authorization` header
5. On 401 error, user is redirected to login

### Protected Routes

```tsx
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

`ProtectedRoute` checks for valid token and redirects if not authenticated.

### API Integration

All API calls go through `src/api/api.ts`:

```typescript
import { authAPI, uploadAPI, transactionsAPI } from './api/api';

// Login
await authAPI.login(email, password);

// Upload file
await uploadAPI.uploadFile(file, onProgress);

// Get transactions
await transactionsAPI.getTransactions({ page: 1, limit: 20 });
```

### File Upload with Progress

```tsx
const [uploadProgress, setUploadProgress] = useState(0);

await uploadAPI.uploadFile(file, (progress) => {
  setUploadProgress(progress); // 0-100
});
```

### Charts with Recharts

```tsx
import { CategoryPieChart, MonthlyTrendChart } from './components/Charts';

<CategoryPieChart data={insights.categoryBreakdown} />
<MonthlyTrendChart data={insights.monthlyTrend} />
```

---

## 🎨 Styling with Tailwind

### Custom Utility Classes

```css
/* Button */
.btn-primary

/* Input */
.input

/* Card */
.card

/* Badges */
.badge-success, .badge-danger, .badge-info
```

### Example Usage

```tsx
<button className="btn-primary">
  Click Me
</button>

<input type="text" className="input" />

<div className="card">
  Card content
</div>
```

---

## 🧪 Testing the Frontend

### Manual Testing

1. **Start backend and ML service**
2. **Start frontend**: `npm run dev`
3. **Test login**: Use `test@example.com` / `rohan123`
4. **Upload file**: Upload sample CSV from `backend/sample_data/`
5. **View dashboard**: Check transactions table
6. **View insights**: Check charts and analytics

### Test User Credentials

```
Email: test@example.com
Password: rohan123
```

---

## 🔧 Development Tips

### Hot Module Replacement (HMR)

Vite provides instant updates on code changes. Save a file and see changes immediately.

### API Proxy

Vite dev server proxies `/api` requests to backend (configured in `vite.config.ts`):

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  }
}
```

This avoids CORS issues during development.

### TypeScript Benefits

- **Type Safety**: Catch errors at compile time
- **IntelliSense**: Auto-completion in VS Code
- **Refactoring**: Rename variables safely

---

## 📊 Sample Data

Create test transactions:

1. Run backend: `npm run prisma:seed`
2. Login to frontend
3. View seeded transactions in dashboard

Or upload CSV file:

```csv
date,description,amount,type
2024-01-15,Walmart Grocery,85.50,DEBIT
2024-01-16,Netflix Subscription,15.99,DEBIT
2024-01-17,Salary Deposit,3500.00,CREDIT
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Change port in vite.config.ts
server: {
  port: 5174
}
```

### API Connection Failed

- Check backend is running: `http://localhost:5000/health`
- Check `.env` has correct `VITE_API_URL`
- Check browser console for errors

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### Token Expired

Tokens expire after 7 days. Logout and login again.

---

## 🚀 Deployment Options

### 1. Static Hosting (Vercel, Netlify)

```bash
npm run build
# Upload dist/ folder
```

Configure environment variable:
```
VITE_API_URL=https://api.yourdomain.com/api
```

### 2. Docker + Nginx

```bash
docker build -t frontend .
docker run -p 80:80 frontend
```

### 3. AWS S3 + CloudFront

```bash
npm run build
aws s3 sync dist/ s3://your-bucket/
```

---

## 📝 Scripts

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Lint code with ESLint
```

---

## 🤝 Integration with Backend

Frontend calls these backend endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | User login |
| `/api/auth/signup` | POST | User registration |
| `/api/upload` | POST | Upload bank statement |
| `/api/transactions` | GET | Get transactions (paginated) |
| `/api/insights` | GET | Get financial insights |

---

## 📚 Technologies Used

- **React 18**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool (faster than Webpack)
- **React Router**: Client-side routing
- **Tailwind CSS**: Utility-first CSS
- **Axios**: HTTP client
- **Recharts**: Charting library
- **Lucide React**: Icon library
- **date-fns**: Date formatting

---

## ✅ Next Steps

1. ✅ Add loading skeletons for better UX
2. ✅ Implement real-time notifications
3. ✅ Add export to CSV/PDF functionality
4. ✅ Implement transaction search
5. ✅ Add dark mode support
6. ✅ Implement transaction editing
7. ✅ Add budget tracking feature

---

## 📞 Support

For issues or questions:
- Check console errors (F12 in browser)
- Verify backend is running
- Check `.env` configuration
- Review API responses in Network tab

---

**Frontend is ready! 🎉**
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import InsightsPage from './pages/InsightsPage';
import { isAuthenticated, transactionsAPI } from './api/api';

// Root redirect logic: if not authed -> /login; if authed and no data -> /upload; else -> /dashboard
const RootRedirect: React.FC = () => {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const decide = async () => {
      if (!isAuthenticated()) {
        setTarget('/login');
        return;
      }
      try {
        const res = await transactionsAPI.getTransactions({ page: 1, limit: 1 });
        if (res.success) {
          const hasAny = res.data && res.data.transactions && res.data.transactions.length > 0;
          setTarget(hasAny ? '/dashboard' : '/upload');
        } else {
          // On API error, default to dashboard (will show error/empty state)
          setTarget('/dashboard');
        }
      } catch {
        setTarget('/dashboard');
      }
    };
    decide();
  }, []);

  if (!target) return null; // brief blank while deciding
  return <Navigate to={target} replace />;
};

function App() {
  return (
    <Router>
      {/* Navigation Bar - Shown on all pages */}
      <Navbar />

      {/* Main Content Area */}
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected Routes - Require Authentication */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <UploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <InsightsPage />
              </ProtectedRoute>
            }
          />

          {/* Root Route - Smart redirect based on auth and data existence */}
          <Route path="/" element={<RootRedirect />} />

          {/* 404 - Catch all other routes */}
          <Route
            path="*"
            element={
              <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
                  <p className="text-xl text-gray-600 mb-6">Page not found</p>
                  <a href="/" className="btn-primary">
                    Go Home
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
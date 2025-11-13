/**
 * Protected Route Component
 * ==========================
 * 
 * This component wraps routes that require authentication.
 * If user is not logged in, redirects to login page.
 * 
 * Usage:
 * ------
 * <Route path="/dashboard" element={
 *   <ProtectedRoute>
 *     <Dashboard />
 *   </ProtectedRoute>
 * } />
 */

import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../api/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component
 * 
 * How it works:
 * -------------
 * 1. Check if user has valid token
 * 2. If authenticated: render children (the protected page)
 * 3. If not authenticated: redirect to login page
 * 
 * @param children - The component(s) to render if authenticated
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Check authentication status
  const isAuth = isAuthenticated();

  // If not authenticated, redirect to login
  // The Navigate component from react-router-dom handles the redirect
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
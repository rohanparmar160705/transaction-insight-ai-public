/**
 * Navbar Component
 * ===============
 * 
 * This component displays navigation links based on authentication state.
 * It also supports logout functionality.
 * 
 * Usage:
 * ------
 * <Navbar />
 */

import { Link, useNavigate } from 'react-router-dom';
import { isAuthenticated, removeToken } from '../api/api';

interface NavbarProps {
  // No props needed for this component
}

/**
 * Navbar component
 * 
 * How it works:
 * -------------
 * 1. Check if user has valid token
 * 2. If authenticated: render dashboard links and logout button
 * 3. If not authenticated: render login and signup links
 * 
 * @param No props needed
 */
const Navbar: React.FC<NavbarProps> = () => {
  const navigate = useNavigate();
  const authed = isAuthenticated();

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link to={authed ? '/dashboard' : '/'} className="text-lg font-semibold text-gray-800">
            Transaction Insight AI
          </Link>
          {authed && (
            <div className="hidden sm:flex items-center space-x-4">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              <Link to="/upload" className="text-gray-600 hover:text-gray-900">Upload</Link>
              <Link to="/insights" className="text-gray-600 hover:text-gray-900">Insights</Link>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {!authed ? (
            <>
              <Link to="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
              <Link to="/signup" className="inline-flex items-center px-3 py-1.5 rounded-md bg-primary-600 text-white hover:bg-primary-700">
                Sign up
              </Link>
            </>
          ) : (
            <button onClick={handleLogout} className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200">
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
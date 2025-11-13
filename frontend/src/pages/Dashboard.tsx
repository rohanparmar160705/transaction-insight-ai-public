/**
 * Dashboard Page
 * ===============
 * 
 * Main dashboard showing transaction list with filters and pagination.
 * Features:
 * - Transaction table with sorting
 * - Filters (category, date range)
 * - Pagination
 * - Search functionality
 * - Loading states
 */

import { useState, useEffect } from 'react';
import { Filter, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { transactionsAPI, Transaction, PaginationInfo } from '../api/api';
import TransactionTable from '../components/TransactionTable';
import { format } from 'date-fns';

const Dashboard: React.FC = () => {
  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [filters, setFilters] = useState({
    category: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  /**
   * Fetch transactions from API
   */
  const fetchTransactions = async (page: number = 1) => {
    setLoading(true);
    setError('');

    try {
      const params: any = {
        page,
        limit: pagination.limit,
      };

      // Add filters if set
      if (filters.category) params.category = filters.category;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await transactionsAPI.getTransactions(params);

      if (response.success) {
        setTransactions(response.data.transactions);
        setPagination(response.data.pagination);
      } else {
        setError(response.error || 'Failed to fetch transactions');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch transactions';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch transactions on component mount and when filters change
   */
  useEffect(() => {
    fetchTransactions(1);
  }, [filters]);

  /**
   * Handle page change
   */
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchTransactions(newPage);
    }
  };

  /**
   * Handle filter change
   */
  const handleFilterChange = (field: string, value: string) => {
    setFilters({ ...filters, [field]: value });
  };

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    setFilters({
      category: '',
      startDate: '',
      endDate: '',
    });
  };

  /**
   * Categories for filter dropdown
   */
  const categories = [
    'Food',
    'Transportation',
    'Entertainment',
    'Shopping',
    'Bills',
    'Income',
    'Travel',
    'Transfer',
    'Insurance',
    'Investment',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-1">
            {pagination.totalCount} total transactions
          </p>
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-outline flex items-center space-x-2"
        >
          <Filter className="h-5 w-5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card mb-6 animate-fadeIn">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Transactions</h3>
          
          <div className="grid md:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="input"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-end mt-4 space-x-3">
            <button onClick={handleClearFilters} className="btn-secondary">
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {/* Transactions Table */}
      <div className="card">
        <TransactionTable transactions={transactions} loading={loading} />

        {/* Pagination */}
        {!loading && transactions.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            {/* Page Info */}
            <div className="text-sm text-gray-600">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
              {pagination.totalCount} transactions
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center space-x-2">
              {/* Previous Button */}
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="btn-secondary disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // Show first, last, current, and neighbors
                    return (
                      page === 1 ||
                      page === pagination.totalPages ||
                      Math.abs(page - pagination.page) <= 1
                    );
                  })
                  .map((page, index, array) => {
                    // Add ellipsis if there's a gap
                    const prevPage = array[index - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;

                    return (
                      <div key={page} className="flex items-center">
                        {showEllipsis && (
                          <span className="px-2 text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            page === pagination.page
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    );
                  })}
              </div>

              {/* Next Button */}
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="btn-secondary disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
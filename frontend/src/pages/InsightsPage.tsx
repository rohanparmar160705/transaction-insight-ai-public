/**
 * Insights Page
 * ==============
 * 
 * Financial insights and analytics dashboard.
 * Features:
 * - Summary statistics (income, expenses, savings)
 * - Category breakdown pie chart
 * - Monthly trend line chart
 * - Top expenses bar chart
 * - Date range filter
 */

import { useState, useEffect } from 'react';
import { Calendar, DollarSign, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import { transactionsAPI, InsightsData } from '../api/api';
import { CategoryPieChart, MonthlyTrendChart, TopExpensesChart, StatCard } from '../components/Charts';

const InsightsPage: React.FC = () => {
  // State
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date range filter (default: last 6 months)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 6))
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  /**
   * Fetch insights from API
   */
  const fetchInsights = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await transactionsAPI.getInsights({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      if (response.success) {
        setInsights(response.data);
      } else {
        setError(response.error || 'Failed to fetch insights');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch insights';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch insights on mount and when date range changes
   */
  useEffect(() => {
    fetchInsights();
  }, [dateRange]);

  /**
   * Handle date range change
   */
  const handleDateChange = (field: string, value: string) => {
    setDateRange({ ...dateRange, [field]: value });
  };

  /**
   * Format currency
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-96">
          <div className="spinner h-16 w-16"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="alert-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // No data state
  if (!insights) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No insights available</p>
          <p className="text-gray-400 text-sm mt-2">
            Upload transactions to view insights
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Financial Insights</h1>
        <p className="text-gray-600 mt-1">
          Analyze your spending patterns and financial health
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Date Range</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Total Income */}
        <StatCard
          title="Total Income"
          value={formatCurrency(insights.totalIncome)}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
        />

        {/* Total Expenses */}
        <StatCard
          title="Total Expenses"
          value={formatCurrency(insights.totalExpenses)}
          icon={<TrendingDown className="h-6 w-6" />}
          color="red"
        />

        {/* Net Savings */}
        <StatCard
          title="Net Savings"
          value={formatCurrency(insights.netSavings)}
          icon={<DollarSign className="h-6 w-6" />}
          color={insights.netSavings >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Category Breakdown */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Spending by Category
          </h3>
          {insights.categoryBreakdown.length > 0 ? (
            <CategoryPieChart data={insights.categoryBreakdown} />
          ) : (
            <p className="text-center text-gray-500 py-12">No category data available</p>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Income vs Expenses Over Time
          </h3>
          {insights.monthlyTrend.length > 0 ? (
            <MonthlyTrendChart data={insights.monthlyTrend} />
          ) : (
            <p className="text-center text-gray-500 py-12">No trend data available</p>
          )}
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Category Breakdown Details
        </h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Total Spent</th>
                <th>Transactions</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {insights.categoryBreakdown.map((category) => (
                <tr key={category.category}>
                  <td>
                    <span className="font-medium">{category.category}</span>
                  </td>
                  <td>
                    <span className="text-red-600 font-semibold">
                      {formatCurrency(category.total)}
                    </span>
                  </td>
                  <td>{category.count}</td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {category.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Expenses */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top 10 Expenses
        </h3>
        {insights.topExpenses.length > 0 ? (
          <>
            <TopExpensesChart data={insights.topExpenses} />
            
            {/* Top Expenses Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.topExpenses.slice(0, 10).map((expense, index) => (
                    <tr key={index}>
                      <td>
                        <span className="font-semibold text-gray-700">
                          #{index + 1}
                        </span>
                      </td>
                      <td className="max-w-xs truncate">{expense.description}</td>
                      <td>
                        <span className="badge badge-info">{expense.category}</span>
                      </td>
                      <td>
                        <span className="text-red-600 font-semibold">
                          {formatCurrency(expense.amount)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        {new Date(expense.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-center text-gray-500 py-12">No expense data available</p>
        )}
      </div>
    </div>
  );
};

export default InsightsPage;
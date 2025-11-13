/**
 * Chart Components
 * =================
 * 
 * Reusable chart components using Recharts library.
 * Includes:
 * - CategoryPieChart: Spending breakdown by category
 * - MonthlyTrendChart: Income/expenses over time
 * - TopExpensesChart: Bar chart of largest expenses
 */

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar
} from 'recharts';

// ============================================================================
// CATEGORY PIE CHART
// ============================================================================

interface CategoryData {
  category: string;
  total: number;
  percentage: number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
}

/**
 * Color palette for categories
 */
const COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Orange
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#84cc16', // Lime
];

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data }) => {
  // Prepare data for pie chart
  const chartData = data.map((item) => ({
    name: item.category,
    value: item.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => 
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(value)
          }
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

// ============================================================================
// MONTHLY TREND LINE CHART
// ============================================================================

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyData[];
}

/**
 * Format month label (YYYY-MM → Mon YYYY)
 */
const formatMonth = (month: string): string => {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({ data }) => {
  // Format data for chart
  const chartData = data.map((item) => ({
    month: formatMonth(item.month),
    income: item.income,
    expenses: Math.abs(item.expenses), // Make expenses positive for display
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="month" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          formatter={(value: number) =>
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(value)
          }
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="income"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: '#10b981', r: 4 }}
          activeDot={{ r: 6 }}
          name="Income"
        />
        <Line
          type="monotone"
          dataKey="expenses"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ fill: '#ef4444', r: 4 }}
          activeDot={{ r: 6 }}
          name="Expenses"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// ============================================================================
// TOP EXPENSES BAR CHART
// ============================================================================

interface ExpenseData {
  description: string;
  amount: number;
  category: string;
}

interface TopExpensesChartProps {
  data: ExpenseData[];
}

export const TopExpensesChart: React.FC<TopExpensesChartProps> = ({ data }) => {
  // Prepare data for bar chart (show top 10)
  const chartData = data
    .slice(0, 10)
    .map((item) => ({
      description: item.description.length > 20 
        ? item.description.substring(0, 20) + '...' 
        : item.description,
      amount: Math.abs(item.amount),
      category: item.category,
    }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          type="number"
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => `$${value}`}
        />
        <YAxis 
          type="category"
          dataKey="description" 
          width={150}
          stroke="#6b7280"
          style={{ fontSize: '11px' }}
        />
        <Tooltip
          formatter={(value: number) =>
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(value)
          }
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
        <Bar 
          dataKey="amount" 
          fill="#ef4444" 
          radius={[0, 4, 4, 0]}
          name="Amount"
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'red' | 'orange';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <div className="flex items-center mt-2 text-sm">
              <span
                className={`${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                } font-medium`}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-gray-500 ml-2">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
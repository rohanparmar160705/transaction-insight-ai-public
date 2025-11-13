/**
 * Transaction Table Component
 * ===========================
 * 
 * This component renders a table of transactions.
 * If no transactions are found, it displays an empty state with a link to upload a CSV file.
 * 
 * Usage:
 * ------
 * <TransactionTable transactions={transactions} loading={loading} />
 */

import { Link } from 'react-router-dom';
import type { Transaction } from '../api/api';

type Props = {
  transactions: Transaction[];
  loading: boolean;
};

const TransactionTable: React.FC<Props> = ({ transactions, loading }) => {
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-600">
        Loading transactions...
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600 mb-4">No transactions found.</p>
        <Link to="/upload" className="btn-primary inline-block">Upload a CSV to get started</Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((t) => {
            // Hybrid inference for type: strong signals override obviously wrong API type
            const rawType = (t.type || '').toUpperCase();
            const categoryUpper = (t.category || '').toUpperCase();
            const desc = (t.description || '').toLowerCase();
            const expenseCategories = new Set([
              'FOOD','TRANSPORTATION','ENTERTAINMENT','SHOPPING','BILLS','TRAVEL','INSURANCE','INVESTMENT','UTILITIES','GROCERIES','RENT','HEALTHCARE','EDUCATION','FEES','TAX','SUBSCRIPTION'
            ]);
            const incomeKeywords = ['salary','paycheck','refund','dividend','interest','deposit'];
            const expenseKeywords = ['bill','subscription','rent','mortgage','airline','flight','hotel','uber','lyft','walmart','costco','amazon','best buy','home depot','restaurant','chipotle','starbucks','insurance','premium','gym','electricity','internet','mobile','water','steam','netflix','spotify','youtube'];
            const transferKeywords = ['transfer','savings account','saving account'];

            const incomeSignal = categoryUpper === 'INCOME' || incomeKeywords.some(k => desc.includes(k));
            const expenseSignal = expenseCategories.has(categoryUpper) || expenseKeywords.some(k => desc.includes(k));
            const transferSignal = categoryUpper === 'TRANSFER' || transferKeywords.some(k => desc.includes(k));

            let displayType: 'DEBIT' | 'CREDIT';
            // 1) Strong signals first
            if (incomeSignal && !expenseSignal) {
              displayType = 'CREDIT';
            } else if (expenseSignal && !incomeSignal) {
              displayType = 'DEBIT';
            // 2) Otherwise, trust API type if valid
            } else if (rawType === 'DEBIT' || rawType === 'CREDIT') {
              displayType = rawType as 'DEBIT' | 'CREDIT';
            // 3) Fallback to amount sign
            } else {
              displayType = t.amount < 0 ? 'DEBIT' : 'CREDIT';
            }
            const isDebit = displayType === 'DEBIT';

            const displayAmount = Math.abs(t.amount).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

            return (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {new Date(t.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {t.description}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                  {isDebit ? `-${displayAmount}` : displayAmount}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-md text-xs ${isDebit ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {displayType}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {t.category}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                  {(t.predictionConfidence * 100).toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
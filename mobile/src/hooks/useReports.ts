/**
 * useReports Hook - Analytics and reporting utilities
 */

import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import api from '../services/api';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

interface ReportSummary {
  totalRevenue: number;
  totalTransactions: number;
  avgTransaction: number;
  growth: number;
  previousPeriodRevenue: number;
}

interface ChartData {
  label: string;
  value: number;
}

interface TopProduct {
  id: string;
  name: string;
  revenue: number;
  quantity: number;
}

interface PeakHour {
  hour: number;
  transactions: number;
}

interface AIInsight {
  id: string;
  type: 'tip' | 'alert' | 'trend';
  title: string;
  description: string;
  icon: string;
}

interface UseReportsReturn {
  period: ReportPeriod;
  summary: ReportSummary | null;
  revenueChart: ChartData[];
  transactionsChart: ChartData[];
  topProducts: TopProduct[];
  peakHours: PeakHour[];
  insights: AIInsight[];
  isLoading: boolean;
  error: string | null;
  setPeriod: (period: ReportPeriod) => void;
  refresh: () => Promise<void>;
  exportPDF: () => Promise<string | null>;
}

const defaultSummary: ReportSummary = {
  totalRevenue: 0,
  totalTransactions: 0,
  avgTransaction: 0,
  growth: 0,
  previousPeriodRevenue: 0,
};

export const useReports = (): UseReportsReturn => {
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [revenueChart, setRevenueChart] = useState<ChartData[]>([]);
  const [transactionsChart, setTransactionsChart] = useState<ChartData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = `/reports/${period}`;
      const response = await api.get(endpoint);
      const data = response.data;

      // Set summary
      setSummary({
        totalRevenue: data.total_revenue || 0,
        totalTransactions: data.total_transactions || 0,
        avgTransaction: data.avg_transaction || 0,
        growth: data.growth || 0,
        previousPeriodRevenue: data.previous_period_revenue || 0,
      });

      // Set chart data
      if (data.revenue_chart) {
        setRevenueChart(
          data.revenue_chart.map((item: { label: string; value: number }) => ({
            label: item.label,
            value: item.value,
          }))
        );
      }

      if (data.transactions_chart) {
        setTransactionsChart(
          data.transactions_chart.map((item: { label: string; value: number }) => ({
            label: item.label,
            value: item.value,
          }))
        );
      }

      // Set top products
      if (data.top_products) {
        setTopProducts(data.top_products);
      }

      // Set peak hours
      if (data.peak_hours) {
        setPeakHours(data.peak_hours);
      }

      // Set AI insights
      if (data.insights) {
        setInsights(data.insights);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError('Failed to load reports');
      // Set mock data for development
      setMockData();
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  const setMockData = () => {
    // Mock summary
    setSummary({
      totalRevenue: 45680,
      totalTransactions: 127,
      avgTransaction: 360,
      growth: 12.5,
      previousPeriodRevenue: 40600,
    });

    // Mock chart data based on period
    if (period === 'daily') {
      setRevenueChart([
        { label: '9AM', value: 2500 },
        { label: '12PM', value: 8900 },
        { label: '3PM', value: 6200 },
        { label: '6PM', value: 12400 },
        { label: '9PM', value: 15680 },
      ]);
      setTransactionsChart([
        { label: '9AM', value: 12 },
        { label: '12PM', value: 35 },
        { label: '3PM', value: 28 },
        { label: '6PM', value: 32 },
        { label: '9PM', value: 20 },
      ]);
    } else if (period === 'weekly') {
      setRevenueChart([
        { label: 'Mon', value: 12500 },
        { label: 'Tue', value: 15800 },
        { label: 'Wed', value: 9200 },
        { label: 'Thu', value: 18400 },
        { label: 'Fri', value: 22100 },
        { label: 'Sat', value: 28900 },
        { label: 'Sun', value: 19600 },
      ]);
      setTransactionsChart([
        { label: 'Mon', value: 45 },
        { label: 'Tue', value: 58 },
        { label: 'Wed', value: 32 },
        { label: 'Thu', value: 67 },
        { label: 'Fri', value: 89 },
        { label: 'Sat', value: 102 },
        { label: 'Sun', value: 73 },
      ]);
    } else {
      setRevenueChart([
        { label: 'W1', value: 95000 },
        { label: 'W2', value: 112000 },
        { label: 'W3', value: 88000 },
        { label: 'W4', value: 145000 },
      ]);
      setTransactionsChart([
        { label: 'W1', value: 320 },
        { label: 'W2', value: 385 },
        { label: 'W3', value: 290 },
        { label: 'W4', value: 468 },
      ]);
    }

    // Mock top products
    setTopProducts([
      { id: '1', name: 'Masala Chai', revenue: 12500, quantity: 250 },
      { id: '2', name: 'Samosa', revenue: 8900, quantity: 178 },
      { id: '3', name: 'Coffee', revenue: 7200, quantity: 120 },
      { id: '4', name: 'Vada Pav', revenue: 5600, quantity: 140 },
      { id: '5', name: 'Pani Puri', revenue: 4800, quantity: 96 },
    ]);

    // Mock peak hours
    setPeakHours([
      { hour: 9, transactions: 35 },
      { hour: 12, transactions: 68 },
      { hour: 13, transactions: 72 },
      { hour: 18, transactions: 85 },
      { hour: 19, transactions: 92 },
      { hour: 20, transactions: 78 },
    ]);

    // Mock AI insights
    setInsights([
      {
        id: '1',
        type: 'trend',
        title: 'Evening Rush',
        description: 'Your busiest time is 6-8 PM. Consider adding staff during these hours.',
        icon: '📈',
      },
      {
        id: '2',
        type: 'tip',
        title: 'Top Performer',
        description: 'Masala Chai contributes 27% of your revenue. Consider promoting it more.',
        icon: '💡',
      },
      {
        id: '3',
        type: 'alert',
        title: 'Low Wednesday Sales',
        description: 'Wednesdays have 40% fewer transactions. Try a mid-week promotion.',
        icon: '⚠️',
      },
    ]);
  };

  useEffect(() => {
    loadReports();
  }, [period, loadReports]);

  const refresh = useCallback(async () => {
    await loadReports();
  }, [loadReports]);

  const exportPDF = useCallback(async (): Promise<string | null> => {
    try {
      const response = await api.post('/reports/export/pdf', { period });
      return response.data.url;
    } catch (err) {
      console.error('Failed to export PDF:', err);
      return null;
    }
  }, [period]);

  return {
    period,
    summary,
    revenueChart,
    transactionsChart,
    topProducts,
    peakHours,
    insights,
    isLoading,
    error,
    setPeriod,
    refresh,
    exportPDF,
  };
};

export default useReports;

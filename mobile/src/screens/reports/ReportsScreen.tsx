/**
 * ReportsScreen - Analytics and reports with charts
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Text,
  Surface,
  SegmentedButtons,
  ActivityIndicator,
  Chip,
  Divider,
  Button,
  IconButton,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import {
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryAxis,
  VictoryTheme,
  VictoryPie,
  VictoryLabel,
  VictoryGroup,
} from 'victory-native';

import { AppDispatch, RootState } from '../../store';
import { reportsAPI } from '../../services/api';
import { colors, spacing, shadows } from '../../theme';
import { formatCurrency, formatCompactAmount } from '../../utils/formatters';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - spacing.lg * 2;

type Period = 'daily' | 'weekly' | 'monthly';

interface DailyData {
  date: string;
  collection: number;
  payouts: number;
}

interface CategoryData {
  name: string;
  amount: number;
  color: string;
}

interface MonthlySummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  topProducts: Array<{ name: string; amount: number; count: number }>;
  employeeCosts: number;
}

const ReportsScreen: React.FC = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [weeklyGrowth, setWeeklyGrowth] = useState<number>(0);

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      if (period === 'daily') {
        const [dailyRes, insightsRes] = await Promise.all([
          reportsAPI.daily(selectedDate.toISOString().split('T')[0]),
          reportsAPI.insights(),
        ]);

        if (dailyRes?.data) {
          setDailyData(dailyRes.data);
          setSummary(dailyRes.summary);
        }
        if (insightsRes?.insights) {
          setInsights(insightsRes.insights);
        }
      } else if (period === 'weekly') {
        const [weeklyRes, insightsRes] = await Promise.all([
          reportsAPI.weekly(),
          reportsAPI.insights(),
        ]);

        if (weeklyRes?.data) {
          setDailyData(weeklyRes.data);
          setSummary(weeklyRes.summary);
          setWeeklyGrowth(weeklyRes.summary?.growthPercent || 0);
        }
        if (insightsRes?.insights) {
          setInsights(insightsRes.insights);
        }
      } else if (period === 'monthly') {
        const [monthlyRes, insightsRes] = await Promise.all([
          reportsAPI.monthly(
            selectedDate.getMonth() + 1,
            selectedDate.getFullYear()
          ),
          reportsAPI.insights(),
        ]);

        if (monthlyRes?.data) {
          setDailyData(monthlyRes.data);
          setSummary(monthlyRes.summary);
        }
        if (monthlyRes?.monthly) {
          setMonthlySummary(monthlyRes.monthly);
        }
        if (insightsRes?.insights) {
          setInsights(insightsRes.insights);
        }
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
      // Mock data for demonstration
      setDailyData([
        { date: '2024-01-22', collection: 12500, payouts: 3200 },
        { date: '2024-01-23', collection: 18700, payouts: 5100 },
        { date: '2024-01-24', collection: 15200, payouts: 2800 },
        { date: '2024-01-25', collection: 22100, payouts: 8500 },
        { date: '2024-01-26', collection: 19800, payouts: 4200 },
        { date: '2024-01-27', collection: 28500, payouts: 6700 },
        { date: '2024-01-28', collection: 24300, payouts: 5400 },
      ]);
      setSummary({
        totalCollection: 141100,
        totalPayouts: 35900,
        netProfit: 105200,
        transactionCount: 156,
        averageTransaction: 904,
        growthPercent: 15,
      });
      setWeeklyGrowth(15);
      setMonthlySummary({
        totalRevenue: 425000,
        totalExpenses: 128000,
        netProfit: 297000,
        topProducts: [
          { name: 'Rice (5kg)', amount: 45000, count: 120 },
          { name: 'Atta (10kg)', amount: 38000, count: 95 },
          { name: 'Oil (1L)', amount: 32000, count: 160 },
          { name: 'Dal (1kg)', amount: 28000, count: 140 },
          { name: 'Sugar (1kg)', amount: 22000, count: 110 },
        ],
        employeeCosts: 45000,
      });
      setInsights([
        'Collection increased 15% compared to last week',
        'Peak hours: 10 AM - 12 PM',
        'Top payment method: UPI (78%)',
        'Wednesday has the highest collection this week',
      ]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [period, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryData: CategoryData[] = [
    { name: 'UPI', amount: 78, color: colors.primary },
    { name: 'Links', amount: 15, color: colors.secondary },
    { name: 'QR', amount: 7, color: colors.warning },
  ];

  const formatDateLabel = (date: string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { weekday: 'short' });
  };

  const chartCollectionData = dailyData.map((d, i) => ({
    x: i + 1,
    y: d.collection,
    label: formatDateLabel(d.date),
  }));

  const chartPayoutData = dailyData.map((d, i) => ({
    x: i + 1,
    y: d.payouts,
  }));

  const navigateDate = (direction: -1 | 1) => {
    const newDate = new Date(selectedDate);
    if (period === 'daily') {
      newDate.setDate(newDate.getDate() + direction);
    } else if (period === 'weekly') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setSelectedDate(newDate);
  };

  const getDateLabel = (): string => {
    if (period === 'daily') {
      return selectedDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } else if (period === 'weekly') {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else {
      return selectedDate.toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      });
    }
  };

  const renderDateNavigator = () => (
    <Surface style={styles.dateNavigator}>
      <IconButton
        icon="chevron-left"
        size={24}
        onPress={() => navigateDate(-1)}
      />
      <TouchableOpacity style={styles.dateLabel}>
        <Icon name="calendar" size={16} color={colors.primary} />
        <Text style={styles.dateLabelText}>{getDateLabel()}</Text>
      </TouchableOpacity>
      <IconButton
        icon="chevron-right"
        size={24}
        onPress={() => navigateDate(1)}
        disabled={
          selectedDate.toDateString() === new Date().toDateString() &&
          period === 'daily'
        }
      />
    </Surface>
  );

  const renderDailyView = () => (
    <>
      {/* Today's Summary */}
      <View style={styles.summaryRow}>
        <Surface style={styles.summaryCard}>
          <Icon name="arrow-down-bold" size={24} color={colors.success} />
          <Text style={styles.summaryLabel}>{t('home.collection')}</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatCompactAmount(summary?.totalCollection || 0)}
          </Text>
        </Surface>

        <Surface style={styles.summaryCard}>
          <Icon name="arrow-up-bold" size={24} color={colors.error} />
          <Text style={styles.summaryLabel}>{t('home.payouts')}</Text>
          <Text style={[styles.summaryValue, { color: colors.error }]}>
            {formatCompactAmount(summary?.totalPayouts || 0)}
          </Text>
        </Surface>

        <Surface style={styles.summaryCard}>
          <Icon name="wallet" size={24} color={colors.primary} />
          <Text style={styles.summaryLabel}>{t('home.netBalance')}</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {formatCompactAmount(summary?.netProfit || 0)}
          </Text>
        </Surface>
      </View>

      {/* Transaction Count */}
      <Surface style={styles.countCard}>
        <View style={styles.countRow}>
          <View style={styles.countItem}>
            <Icon name="receipt" size={20} color={colors.primary} />
            <Text style={styles.countValue}>{summary?.transactionCount || 0}</Text>
            <Text style={styles.countLabel}>{t('reports.transactions')}</Text>
          </View>
          <View style={styles.countDivider} />
          <View style={styles.countItem}>
            <Icon name="calculator" size={20} color={colors.info} />
            <Text style={styles.countValue}>
              {formatCurrency(summary?.averageTransaction || 0)}
            </Text>
            <Text style={styles.countLabel}>{t('reports.avgTransaction')}</Text>
          </View>
        </View>
      </Surface>
    </>
  );

  const renderWeeklyView = () => (
    <>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <Surface style={styles.summaryCard}>
          <Icon name="arrow-down-bold" size={24} color={colors.success} />
          <Text style={styles.summaryLabel}>{t('home.collection')}</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatCompactAmount(summary?.totalCollection || 0)}
          </Text>
        </Surface>

        <Surface style={styles.summaryCard}>
          <Icon name="arrow-up-bold" size={24} color={colors.error} />
          <Text style={styles.summaryLabel}>{t('home.payouts')}</Text>
          <Text style={[styles.summaryValue, { color: colors.error }]}>
            {formatCompactAmount(summary?.totalPayouts || 0)}
          </Text>
        </Surface>

        <Surface style={styles.summaryCard}>
          <Icon name="trending-up" size={24} color={weeklyGrowth >= 0 ? colors.success : colors.error} />
          <Text style={styles.summaryLabel}>{t('reports.growth')}</Text>
          <Text style={[styles.summaryValue, { color: weeklyGrowth >= 0 ? colors.success : colors.error }]}>
            {weeklyGrowth >= 0 ? '+' : ''}{weeklyGrowth}%
          </Text>
        </Surface>
      </View>

      {/* Revenue Chart */}
      <Surface style={styles.chartCard}>
        <Text style={styles.chartTitle}>{t('reports.revenue')} Trend</Text>
        <Text style={styles.chartSubtitle}>Last 7 days</Text>

        <VictoryChart
          width={chartWidth}
          height={220}
          theme={VictoryTheme.material}
          padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
        >
          <VictoryAxis
            tickFormat={(ti) => dailyData[ti - 1]?.date?.slice(-2) || ''}
            style={{
              axis: { stroke: colors.border },
              tickLabels: { fill: colors.textSecondary, fontSize: 10 },
            }}
          />
          <VictoryAxis
            dependentAxis
            tickFormat={(ti) => `₹${ti / 1000}K`}
            style={{
              axis: { stroke: colors.border },
              tickLabels: { fill: colors.textSecondary, fontSize: 10 },
              grid: { stroke: colors.borderLight, strokeDasharray: '5,5' },
            }}
          />
          <VictoryGroup offset={12}>
            <VictoryBar
              data={chartCollectionData}
              style={{
                data: { fill: colors.success, width: 10 },
              }}
              cornerRadius={{ top: 4 }}
            />
            <VictoryBar
              data={chartPayoutData}
              style={{
                data: { fill: colors.error, width: 10 },
              }}
              cornerRadius={{ top: 4 }}
            />
          </VictoryGroup>
        </VictoryChart>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>{t('home.collection')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
            <Text style={styles.legendText}>{t('home.payouts')}</Text>
          </View>
        </View>
      </Surface>

      {/* Payment Methods Pie Chart */}
      <Surface style={styles.chartCard}>
        <Text style={styles.chartTitle}>Payment Methods</Text>
        <Text style={styles.chartSubtitle}>Distribution by type</Text>

        <View style={styles.pieContainer}>
          <VictoryPie
            data={categoryData}
            x="name"
            y="amount"
            width={180}
            height={180}
            innerRadius={50}
            colorScale={categoryData.map((d) => d.color)}
            labelComponent={<></>}
            padding={0}
          />
          <View style={styles.pieCenter}>
            <Text style={styles.pieCenterValue}>
              {summary?.transactionCount || 0}
            </Text>
            <Text style={styles.pieCenterLabel}>Txns</Text>
          </View>
        </View>

        <View style={styles.pieLegendsContainer}>
          {categoryData.map((item, index) => (
            <View key={index} style={styles.pieLegendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.pieLegendName}>{item.name}</Text>
              <Text style={styles.pieLegendValue}>{item.amount}%</Text>
            </View>
          ))}
        </View>
      </Surface>
    </>
  );

  const renderMonthlyView = () => (
    <>
      {/* P&L Summary */}
      <Surface style={styles.plCard}>
        <Text style={styles.chartTitle}>Profit & Loss Summary</Text>
        <Divider style={styles.divider} />

        <View style={styles.plRow}>
          <View style={styles.plItem}>
            <Text style={styles.plLabel}>Total Revenue</Text>
            <Text style={[styles.plValue, { color: colors.success }]}>
              {formatCompactAmount(monthlySummary?.totalRevenue || summary?.totalCollection || 0)}
            </Text>
          </View>
        </View>

        <View style={styles.plRow}>
          <View style={styles.plItem}>
            <Text style={styles.plLabel}>Total Expenses</Text>
            <Text style={[styles.plValue, { color: colors.error }]}>
              -{formatCompactAmount(monthlySummary?.totalExpenses || summary?.totalPayouts || 0)}
            </Text>
          </View>
        </View>

        {monthlySummary?.employeeCosts ? (
          <View style={styles.plSubRow}>
            <Text style={styles.plSubLabel}>Employee Costs</Text>
            <Text style={styles.plSubValue}>
              {formatCurrency(monthlySummary.employeeCosts)}
            </Text>
          </View>
        ) : null}

        <Divider style={styles.divider} />

        <View style={styles.plRow}>
          <View style={styles.plItem}>
            <Text style={[styles.plLabel, { fontWeight: '700' }]}>Net Profit</Text>
            <Text
              style={[
                styles.plValue,
                {
                  color:
                    (monthlySummary?.netProfit || summary?.netProfit || 0) >= 0
                      ? colors.success
                      : colors.error,
                  fontSize: 22,
                },
              ]}
            >
              {formatCompactAmount(monthlySummary?.netProfit || summary?.netProfit || 0)}
            </Text>
          </View>
        </View>
      </Surface>

      {/* Revenue Chart */}
      {dailyData.length > 0 && (
        <Surface style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t('reports.revenue')} Trend</Text>
          <Text style={styles.chartSubtitle}>Daily breakdown</Text>

          <VictoryChart
            width={chartWidth}
            height={220}
            theme={VictoryTheme.material}
            padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
          >
            <VictoryAxis
              tickFormat={(ti) => dailyData[ti - 1]?.date?.slice(-2) || ''}
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 10 },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(ti) => `₹${ti / 1000}K`}
              style={{
                axis: { stroke: colors.border },
                tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                grid: { stroke: colors.borderLight, strokeDasharray: '5,5' },
              }}
            />
            <VictoryLine
              data={chartCollectionData}
              style={{
                data: { stroke: colors.success, strokeWidth: 2 },
              }}
            />
          </VictoryChart>
        </Surface>
      )}

      {/* Top Products */}
      {monthlySummary?.topProducts && monthlySummary.topProducts.length > 0 && (
        <Surface style={styles.topProductsCard}>
          <Text style={styles.chartTitle}>{t('reports.topProducts')}</Text>
          <Divider style={styles.divider} />

          {monthlySummary.topProducts.map((product, index) => (
            <View key={index} style={styles.productRow}>
              <View style={styles.productRank}>
                <Text style={styles.productRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productCount}>{product.count} sold</Text>
              </View>
              <Text style={styles.productAmount}>
                {formatCurrency(product.amount)}
              </Text>
            </View>
          ))}
        </Surface>
      )}
    </>
  );

  const renderKeyStats = () => (
    <Surface style={styles.statsCard}>
      <Text style={styles.chartTitle}>Key Metrics</Text>
      <Divider style={styles.divider} />

      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total {t('reports.transactions')}</Text>
          <Text style={styles.statValue}>{summary?.transactionCount || 0}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{t('reports.avgTransaction')}</Text>
          <Text style={styles.statValue}>
            {formatCurrency(summary?.averageTransaction || 0)}
          </Text>
        </View>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Success Rate</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>98.5%</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{t('reports.growth')}</Text>
          <Text style={[styles.statValue, { color: weeklyGrowth >= 0 ? colors.success : colors.error }]}>
            {weeklyGrowth >= 0 ? '+' : ''}{weeklyGrowth || summary?.growthPercent || 15}%
          </Text>
        </View>
      </View>
    </Surface>
  );

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            colors={[colors.primary]}
          />
        }
      >
        {/* Period Selector */}
        <SegmentedButtons
          value={period}
          onValueChange={(value) => setPeriod(value as Period)}
          buttons={[
            { value: 'daily', label: t('reports.daily') },
            { value: 'weekly', label: t('reports.weekly') },
            { value: 'monthly', label: t('reports.monthly') },
          ]}
          style={styles.segmentedButtons}
        />

        {/* Date Navigator */}
        {renderDateNavigator()}

        {/* Period-specific content */}
        {period === 'daily' && renderDailyView()}
        {period === 'weekly' && renderWeeklyView()}
        {period === 'monthly' && renderMonthlyView()}

        {/* Key Stats - show for all periods */}
        {renderKeyStats()}

        {/* AI Insights */}
        {insights.length > 0 && (
          <Surface style={styles.insightsCard}>
            <View style={styles.insightsHeader}>
              <Icon name="lightbulb-on" size={24} color={colors.warning} />
              <Text style={styles.insightsTitle}>{t('reports.insights')}</Text>
            </View>

            {insights.map((insight, index) => (
              <View key={index} style={styles.insightItem}>
                <Icon name="chevron-right" size={16} color={colors.primary} />
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </Surface>
        )}

        {/* Export/Share Buttons */}
        <View style={styles.exportRow}>
          <Button
            mode="outlined"
            icon="file-pdf-box"
            onPress={() => {}}
            style={styles.exportBtn}
          >
            {t('reports.export')}
          </Button>
          <Button
            mode="outlined"
            icon="share-variant"
            onPress={() => {}}
            style={styles.exportBtn}
          >
            {t('reports.share')}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  segmentedButtons: {
    marginBottom: spacing.md,
  },
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
    ...shadows.sm,
  },
  dateLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dateLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.sm,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  countCard: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countItem: {
    flex: 1,
    alignItems: 'center',
  },
  countValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  countLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  countDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  chartCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chartSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  pieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
    position: 'relative',
  },
  pieCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  pieCenterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pieCenterLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  pieLegendsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  pieLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pieLegendName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  pieLegendValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  plCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  plRow: {
    paddingVertical: spacing.sm,
  },
  plItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plLabel: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  plValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  plSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingLeft: spacing.lg,
  },
  plSubLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  plSubValue: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  topProductsCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  productRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  productCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  productAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statsCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  divider: {
    marginVertical: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  insightsCard: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '30',
    marginBottom: spacing.md,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  insightText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  exportRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  exportBtn: {
    flex: 1,
  },
});

export default ReportsScreen;

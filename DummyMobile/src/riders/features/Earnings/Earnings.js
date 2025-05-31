/**
 * Component: Earnings
 * Purpose: Detailed earnings dashboard with analytics, payment history, and financial insights
 * Props: 
 *   - navigation: React Navigation object for screen transitions
 * Dependencies: React Native, Shared Components, Chart Library, SimulatedApi
 * Data Flow: Displays comprehensive earnings data with graphs, breakdowns, and payment tracking
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { EcoCard, EcoButton, LoadingSpinner } from '../../../shared/components';
import { Colors, Typography, Spacing } from '../../../shared/theme';
import { DriverAPI } from '../../../shared/api/simulatedApi';

const { width } = Dimensions.get('window');

const Earnings = ({ navigation }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // 'day', 'week', 'month', 'year'
  const [earningsData, setEarningsData] = useState({
    totalEarnings: 0,
    baseFare: 0,
    tips: 0,
    bonuses: 0,
    ecoBonus: 0,
    peakHourBonus: 0,
    rides: 0,
    hours: 0,
    pendingPayment: 0,
  });
  
  const [chartData, setChartData] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [goals, setGoals] = useState({
    dailyTarget: 1000,
    weeklyTarget: 7000,
    monthlyTarget: 30000,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEarningsData();
  }, [selectedPeriod]);
  /**
   * Load earnings data based on selected period
   */
  const loadEarningsData = async () => {
    try {
      setIsLoading(true);
      const response = await DriverAPI.getEarnings('driver_1', selectedPeriod);
      
      if (response.success) {
        const earnings = response.earnings;
        setEarningsData({
          totalEarnings: earnings.total,
          rideEarnings: earnings.total - earnings.tips - earnings.bonuses,
          tips: earnings.tips,
          bonuses: earnings.bonuses,
          ecoBonus: Math.round(earnings.bonuses * 0.3), // 30% of bonuses are eco
          peakHourBonus: Math.round(earnings.bonuses * 0.7), // 70% are peak hour
          rides: earnings.rides,
          hours: earnings.hours,
          pendingPayment: earnings.total * 0.1, // 10% pending
        });
        
        // Format chart data
        if (earnings.breakdown) {
          setChartData(earnings.breakdown);
        }
        
        // Set goals from response
        if (response.goals) {
          setGoals({
            dailyTarget: response.goals.daily.target,
            weeklyTarget: response.goals.weekly.target,
            monthlyTarget: response.goals.monthly.target,
          });
        }
      }
    } catch (error) {
      console.error('Error loading earnings data:', error);
      Alert.alert('Error', 'Failed to load earnings data');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle period change
   */
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };

  /**
   * Handle refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadEarningsData();
    setRefreshing(false);
  };

  /**
   * Request payout
   */
  const requestPayout = async () => {
    if (earningsData.pendingPayment < 100) {
      Alert.alert('Minimum Payout', 'Minimum payout amount is ₹100');
      return;
    }
    
    Alert.alert(
      'Request Payout',
      `Request payout of ₹${earningsData.pendingPayment}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            try {
              await simulatedApi.requestPayout(earningsData.pendingPayment);
              Alert.alert('Success', 'Payout request submitted successfully');
              loadEarningsData();
            } catch (error) {
              Alert.alert('Error', 'Failed to request payout');
            }
          }
        }
      ]
    );
  };

  /**
   * Calculate progress towards goal
   */
  const getGoalProgress = () => {
    const target = selectedPeriod === 'day' ? goals.dailyTarget :
                  selectedPeriod === 'week' ? goals.weeklyTarget :
                  goals.monthlyTarget;
    
    return Math.min((earningsData.totalEarnings / target) * 100, 100);
  };

  /**
   * Render simple chart
   */
  const renderChart = () => {
    const maxValue = Math.max(...chartData.map(item => item.value));
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartBars}>
          {chartData.map((item, index) => (
            <View key={index} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: (item.value / maxValue) * 100,
                    backgroundColor: Colors.primary,
                  }
                ]}
              />
              <Text style={styles.barLabel}>{item.label}</Text>
              <Text style={styles.barValue}>₹{item.value}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading earnings..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {['day', 'week', 'month', 'year'].map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive
            ]}
            onPress={() => handlePeriodChange(period)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive
            ]}>
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Total Earnings */}
      <EcoCard style={styles.totalEarningsCard}>
        <View style={styles.totalEarningsHeader}>
          <Text style={styles.cardTitle}>
            {selectedPeriod === 'day' ? 'Today\'s' : 
             selectedPeriod === 'week' ? 'This Week\'s' : 
             selectedPeriod === 'month' ? 'This Month\'s' : 'This Year\'s'} Earnings
          </Text>
          <TouchableOpacity>
            <Icon name="info-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.totalAmount}>₹{earningsData.totalEarnings}</Text>
        
        <View style={styles.earningsStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{earningsData.rides}</Text>
            <Text style={styles.statLabel}>Rides</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{earningsData.hours}h</Text>
            <Text style={styles.statLabel}>Online</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{Math.round(earningsData.totalEarnings / earningsData.rides || 0)}</Text>
            <Text style={styles.statLabel}>Per Ride</Text>
          </View>
        </View>
        
        {/* Goal Progress */}
        <View style={styles.goalProgress}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalLabel}>Goal Progress</Text>
            <Text style={styles.goalPercentage}>{Math.round(getGoalProgress())}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${getGoalProgress()}%` }
              ]}
            />
          </View>
        </View>
      </EcoCard>

      {/* Earnings Breakdown */}
      <EcoCard style={styles.breakdownCard}>
        <Text style={styles.cardTitle}>Earnings Breakdown</Text>
        
        <View style={styles.breakdownList}>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownInfo}>
              <Icon name="attach-money" size={20} color={Colors.primary} />
              <Text style={styles.breakdownLabel}>Base Fare</Text>
            </View>
            <Text style={styles.breakdownValue}>₹{earningsData.baseFare}</Text>
          </View>
          
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownInfo}>
              <Icon name="star" size={20} color={Colors.accent} />
              <Text style={styles.breakdownLabel}>Tips</Text>
            </View>
            <Text style={styles.breakdownValue}>₹{earningsData.tips}</Text>
          </View>
          
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownInfo}>
              <Icon name="eco" size={20} color={Colors.success} />
              <Text style={styles.breakdownLabel}>Eco Bonus</Text>
            </View>
            <Text style={styles.breakdownValue}>₹{earningsData.ecoBonus}</Text>
          </View>
          
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownInfo}>
              <Icon name="trending-up" size={20} color={Colors.warning} />
              <Text style={styles.breakdownLabel}>Peak Hour Bonus</Text>
            </View>
            <Text style={styles.breakdownValue}>₹{earningsData.peakHourBonus}</Text>
          </View>
          
          <View style={[styles.breakdownItem, styles.totalItem]}>
            <View style={styles.breakdownInfo}>
              <Icon name="account-balance-wallet" size={20} color={Colors.textPrimary} />
              <Text style={[styles.breakdownLabel, styles.totalLabel]}>Total</Text>
            </View>
            <Text style={[styles.breakdownValue, styles.totalValue]}>₹{earningsData.totalEarnings}</Text>
          </View>
        </View>
      </EcoCard>

      {/* Earnings Chart */}
      <EcoCard style={styles.chartCard}>
        <Text style={styles.cardTitle}>Earnings Trend</Text>
        {chartData.length > 0 && renderChart()}
      </EcoCard>

      {/* Pending Payment */}
      <EcoCard style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <Text style={styles.cardTitle}>Pending Payment</Text>
          <View style={styles.pendingAmount}>
            <Text style={styles.pendingValue}>₹{earningsData.pendingPayment}</Text>
            <Text style={styles.pendingLabel}>Available for payout</Text>
          </View>
        </View>
        
        <EcoButton
          title="Request Payout"
          onPress={requestPayout}
          style={styles.payoutButton}
          disabled={earningsData.pendingPayment < 100}
        />
        
        <Text style={styles.payoutNote}>
          Minimum payout amount is ₹100. Payouts are processed within 1-2 business days.
        </Text>
      </EcoCard>

      {/* Payment History */}
      <EcoCard style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Text style={styles.cardTitle}>Recent Payments</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {paymentHistory.length > 0 ? (
          paymentHistory.slice(0, 3).map((payment) => (
            <View key={payment.id} style={styles.paymentItem}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentDate}>{payment.date}</Text>
                <Text style={styles.paymentMethod}>{payment.method}</Text>
              </View>
              <View style={styles.paymentAmount}>
                <Text style={styles.paymentValue}>₹{payment.amount}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: payment.status === 'completed' ? Colors.successLight : Colors.warningLight }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: payment.status === 'completed' ? Colors.success : Colors.warning }
                  ]}>
                    {payment.status}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="payment" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyStateText}>No payment history</Text>
          </View>
        )}
      </EcoCard>

      {/* Earning Tips */}
      <EcoCard style={styles.tipsCard}>
        <Text style={styles.cardTitle}>💡 Earning Tips</Text>
        
        <View style={styles.tipsList}>
          <View style={styles.tipItem}>
            <Icon name="eco" size={20} color={Colors.success} />
            <Text style={styles.tipText}>Drive eco-friendly vehicles to earn bonus rewards</Text>
          </View>
          
          <View style={styles.tipItem}>
            <Icon name="schedule" size={20} color={Colors.warning} />
            <Text style={styles.tipText}>Drive during peak hours for higher fares</Text>
          </View>
          
          <View style={styles.tipItem}>
            <Icon name="star" size={20} color={Colors.accent} />
            <Text style={styles.tipText}>Maintain high ratings to receive more ride requests</Text>
          </View>
          
          <View style={styles.tipItem}>
            <Icon name="location-on" size={20} color={Colors.primary} />
            <Text style={styles.tipText}>Stay in high-demand areas for more opportunities</Text>
          </View>
        </View>
      </EcoCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    margin: Spacing.medium,
    borderRadius: 8,
    padding: Spacing.xsmall,
  },
  periodButton: {
    flex: 1,
    paddingVertical: Spacing.small,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodButtonText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: Colors.surface,
  },
  totalEarningsCard: {
    margin: Spacing.medium,
    backgroundColor: Colors.primaryLight,
  },
  totalEarningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  cardTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  totalAmount: {
    ...Typography.h1,
    color: Colors.primary,
    textAlign: 'center',
    marginVertical: Spacing.large,
  },
  earningsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.large,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xsmall,
  },
  goalProgress: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.medium,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.small,
  },
  goalLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  goalPercentage: {
    ...Typography.body,
    color: Colors.success,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  breakdownCard: {
    margin: Spacing.medium,
  },
  breakdownList: {
    marginTop: Spacing.medium,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  totalItem: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    marginTop: Spacing.small,
    paddingTop: Spacing.medium,
  },
  breakdownInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginLeft: Spacing.small,
  },
  totalLabel: {
    fontWeight: '600',
  },
  breakdownValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  totalValue: {
    ...Typography.h4,
    color: Colors.success,
  },
  chartCard: {
    margin: Spacing.medium,
  },
  chartContainer: {
    marginTop: Spacing.medium,
    height: 150,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 30,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    borderRadius: 2,
    marginBottom: Spacing.small,
  },
  barLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xsmall,
  },
  barValue: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  paymentCard: {
    margin: Spacing.medium,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  pendingAmount: {
    alignItems: 'flex-end',
  },
  pendingValue: {
    ...Typography.h3,
    color: Colors.success,
  },
  pendingLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  payoutButton: {
    marginVertical: Spacing.medium,
  },
  payoutNote: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  historyCard: {
    margin: Spacing.medium,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  viewAllText: {
    ...Typography.body,
    color: Colors.primary,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDate: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.xsmall,
  },
  paymentMethod: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  paymentValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xsmall,
  },
  statusBadge: {
    paddingHorizontal: Spacing.small,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    ...Typography.caption,
    fontSize: 10,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xlarge,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.medium,
  },
  tipsCard: {
    margin: Spacing.medium,
    marginBottom: Spacing.xlarge,
  },
  tipsList: {
    marginTop: Spacing.medium,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.medium,
  },
  tipText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginLeft: Spacing.medium,
    flex: 1,
  },
});

export default Earnings;

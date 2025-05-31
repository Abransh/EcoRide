/**
 * Component: RidesScreen (Driver)
 * Purpose: Display driver's ride history, earnings summary, and ride statistics
 * Props: 
 *   - navigation: React Navigation object for screen transitions
 * Dependencies: React Native, Shared Components, SimulatedApi
 * Data Flow: Shows completed rides, earnings breakdown, and performance metrics
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { EcoCard, EcoButton, LoadingSpinner } from '../../../shared/components';
import { Colors, Typography, Spacing } from '../../../shared/theme';
import { RideAPI, DriverAPI } from '../../../shared/api/simulatedApi';

const RidesScreen = ({ navigation }) => {
  const [rides, setRides] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('today'); // 'today', 'week', 'month'
  const [summary, setSummary] = useState({
    totalRides: 0,
    totalEarnings: 0,
    totalDistance: 0,
    averageRating: 0,
    carbonSaved: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRideData();
  }, [selectedPeriod]);
  /**
   * Load ride history and summary based on selected period
   */
  const loadRideData = async () => {
    try {
      setIsLoading(true);
      const [rideHistoryResponse, earningsResponse] = await Promise.all([
        RideAPI.getRideHistory('driver_1'),
        DriverAPI.getEarnings('driver_1', selectedPeriod),
      ]);
      
      if (rideHistoryResponse.success) {
        setRides(rideHistoryResponse.rides);
      }
      
      if (earningsResponse.success) {
        const earnings = earningsResponse.earnings;
        setSummary({
          totalEarnings: earnings.total,
          totalRides: earnings.rides,
          totalHours: earnings.hours,
          averageRating: 4.9,
          carbonSaved: earnings.rides * 2.5, // Estimate
          tips: earnings.tips,
          bonuses: earnings.bonuses,
        });
      }
    } catch (error) {
      console.error('Error loading ride data:', error);
      Alert.alert('Error', 'Failed to load ride history');
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
    await loadRideData();
    setRefreshing(false);
  };

  /**
   * Navigate to ride details
   */
  const viewRideDetails = (ride) => {
    navigation.navigate('RideDetails', { ride });
  };

  /**
   * Render ride item
   */
  const renderRideItem = ({ item: ride }) => (
    <TouchableOpacity
      style={styles.rideItem}
      onPress={() => viewRideDetails(ride)}
    >
      <View style={styles.rideHeader}>
        <View style={styles.rideInfo}>
          <Text style={styles.rideDate}>{ride.date}</Text>
          <Text style={styles.rideTime}>{ride.time}</Text>
        </View>
        <View style={styles.rideEarnings}>
          <Text style={styles.earningsAmount}>₹{ride.fare}</Text>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color={Colors.accent} />
            <Text style={styles.ratingText}>{ride.rating}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.rideRoute}>
        <View style={styles.routePoint}>
          <Icon name="radio-button-checked" size={12} color={Colors.success} />
          <Text style={styles.routeText}>{ride.pickupAddress}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <Icon name="place" size={12} color={Colors.error} />
          <Text style={styles.routeText}>{ride.dropoffAddress}</Text>
        </View>
      </View>
      
      <View style={styles.rideFooter}>
        <Text style={styles.rideDistance}>{ride.distance}km</Text>
        <Text style={styles.rideDuration}>{ride.duration} min</Text>
        <Text style={styles.rideType}>{ride.vehicleType}</Text>
        {ride.ecoFriendly && (
          <View style={styles.ecoTag}>
            <Icon name="eco" size={12} color={Colors.success} />
            <Text style={styles.ecoTagText}>Eco</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading ride history..." />;
  }

  return (
    <View style={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {['today', 'week', 'month'].map((period) => (
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

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Card */}
        <EcoCard style={styles.summaryCard}>
          <Text style={styles.cardTitle}>
            {selectedPeriod === 'today' ? 'Today\'s' : 
             selectedPeriod === 'week' ? 'This Week\'s' : 'This Month\'s'} Summary
          </Text>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Icon name="directions-car" size={24} color={Colors.primary} />
              <Text style={styles.summaryValue}>{summary.totalRides}</Text>
              <Text style={styles.summaryLabel}>Rides</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Icon name="attach-money" size={24} color={Colors.success} />
              <Text style={styles.summaryValue}>₹{summary.totalEarnings}</Text>
              <Text style={styles.summaryLabel}>Earnings</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Icon name="straighten" size={24} color={Colors.warning} />
              <Text style={styles.summaryValue}>{summary.totalDistance}km</Text>
              <Text style={styles.summaryLabel}>Distance</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Icon name="star" size={24} color={Colors.accent} />
              <Text style={styles.summaryValue}>{summary.averageRating}</Text>
              <Text style={styles.summaryLabel}>Rating</Text>
            </View>
          </View>
          
          <View style={styles.ecoSummary}>
            <Icon name="eco" size={20} color={Colors.success} />
            <Text style={styles.ecoSummaryText}>
              Carbon saved: {summary.carbonSaved}kg CO₂
            </Text>
          </View>
        </EcoCard>

        {/* Earnings Quick View */}
        <EcoCard style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Text style={styles.cardTitle}>Earnings Breakdown</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Earnings')}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Icon name="chevron-right" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.earningsBreakdown}>
            <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Base Fare</Text>
              <Text style={styles.earningsValue}>₹{(summary.totalEarnings * 0.8).toFixed(0)}</Text>
            </View>
            <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Tips</Text>
              <Text style={styles.earningsValue}>₹{(summary.totalEarnings * 0.15).toFixed(0)}</Text>
            </View>
            <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Eco Bonus</Text>
              <Text style={styles.earningsValue}>₹{(summary.totalEarnings * 0.05).toFixed(0)}</Text>
            </View>
            <View style={[styles.earningsRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{summary.totalEarnings}</Text>
            </View>
          </View>
        </EcoCard>

        {/* Ride History */}
        <EcoCard style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.cardTitle}>Recent Rides</Text>
            <Text style={styles.rideCount}>{rides.length} rides</Text>
          </View>
          
          {rides.length > 0 ? (
            <FlatList
              data={rides}
              renderItem={renderRideItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Icon name="directions-car" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyStateText}>No rides found</Text>
              <Text style={styles.emptyStateSubtext}>
                {selectedPeriod === 'today' ? 'Complete your first ride today!' :
                 'Try selecting a different time period'}
              </Text>
            </View>
          )}
        </EcoCard>

        {/* Quick Actions */}
        <EcoCard style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          
          <View style={styles.actionsList}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => navigation.navigate('Earnings')}
            >
              <Icon name="trending-up" size={24} color={Colors.primary} />
              <Text style={styles.actionText}>Detailed Earnings</Text>
              <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => navigation.navigate('Home')}
            >
              <Icon name="home" size={24} color={Colors.primary} />
              <Text style={styles.actionText}>Back to Dashboard</Text>
              <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </EcoCard>
      </ScrollView>
    </View>
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
  summaryCard: {
    margin: Spacing.medium,
  },
  cardTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.medium,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: Spacing.medium,
  },
  summaryValue: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginTop: Spacing.xsmall,
  },
  summaryLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xsmall,
  },
  ecoSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.successLight,
    padding: Spacing.medium,
    borderRadius: 8,
    marginTop: Spacing.medium,
  },
  ecoSummaryText: {
    ...Typography.body,
    color: Colors.success,
    marginLeft: Spacing.small,
    fontWeight: '600',
  },
  earningsCard: {
    margin: Spacing.medium,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    ...Typography.body,
    color: Colors.primary,
    marginRight: Spacing.xsmall,
  },
  earningsBreakdown: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.medium,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  totalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    marginTop: Spacing.small,
    paddingTop: Spacing.medium,
  },
  earningsLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  earningsValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  totalLabel: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  totalValue: {
    ...Typography.h4,
    color: Colors.success,
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
  rideCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  rideItem: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.medium,
    marginBottom: Spacing.small,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.medium,
  },
  rideInfo: {
    flex: 1,
  },
  rideDate: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  rideTime: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  rideEarnings: {
    alignItems: 'flex-end',
  },
  earningsAmount: {
    ...Typography.h4,
    color: Colors.success,
    marginBottom: Spacing.xsmall,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginLeft: Spacing.xsmall,
  },
  rideRoute: {
    marginBottom: Spacing.medium,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xsmall,
  },
  routeLine: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginLeft: 6,
    marginBottom: Spacing.xsmall,
  },
  routeText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginLeft: Spacing.small,
    flex: 1,
  },
  rideFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideDistance: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginRight: Spacing.medium,
  },
  rideDuration: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginRight: Spacing.medium,
  },
  rideType: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
  ecoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.small,
    paddingVertical: 2,
    borderRadius: 12,
  },
  ecoTagText: {
    ...Typography.caption,
    color: Colors.success,
    marginLeft: 2,
    fontSize: 10,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xlarge,
  },
  emptyStateText: {
    ...Typography.h4,
    color: Colors.textSecondary,
    marginTop: Spacing.medium,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.small,
    textAlign: 'center',
  },
  actionsCard: {
    margin: Spacing.medium,
    marginBottom: Spacing.xlarge,
  },
  actionsList: {
    marginTop: Spacing.medium,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.medium,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: Spacing.small,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: Spacing.medium,
  },
});

export default RidesScreen;

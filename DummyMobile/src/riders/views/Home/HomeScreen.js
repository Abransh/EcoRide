/**
 * Component: HomeScreen (Driver)
 * Purpose: Main dashboard for drivers showing ride requests, earnings, and status controls
 * Props: 
 *   - navigation: React Navigation object for screen transitions
 * Dependencies: React Native, Shared Components, Driver Features
 * Data Flow: Displays real-time ride requests, driver status, and quick access to earnings/navigation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { EcoCard, EcoButton, LoadingSpinner } from '../../../shared/components';
import { Colors, Typography, Spacing } from '../../../shared/theme';
import { DriverAPI } from '../../../shared/api/simulatedApi';
import RideManagement from '../../features/RideManagement/RideManagement';

const HomeScreen = ({ navigation }) => {
  const [driverStatus, setDriverStatus] = useState('offline'); // 'online', 'offline', 'busy'
  const [currentRide, setCurrentRide] = useState(null);
  const [rideRequests, setRideRequests] = useState([]);
  const [todaysStats, setTodaysStats] = useState({
    earnings: 0,
    trips: 0,
    hours: 0,
    rating: 4.8,
    carbonSaved: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDriverData();
  }, []);
  /**
   * Load driver dashboard data
   */
  const loadDriverData = async () => {
    try {
      setIsLoading(true);
      const [statusResponse, requestsResponse] = await Promise.all([
        DriverAPI.getDriverStatus('driver_1'),
        DriverAPI.getRideRequests('driver_1'),
      ]);
      
      if (statusResponse.success) {
        const stats = statusResponse.status;
        setTodaysStats({
          earnings: stats.todayEarnings,
          trips: stats.todayRides,
          hours: stats.hoursWorked,
          rating: stats.rating,
          carbonSaved: stats.carbonSaved,
        });
        setCurrentRide(stats.activeRide);
        setDriverStatus(stats.currentStatus);
      }
      
      if (requestsResponse.success) {
        setRideRequests(requestsResponse.requests);
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };
  /**
   * Handle driver status toggle
   */
  const toggleDriverStatus = async () => {
    try {
      const newStatus = driverStatus === 'online' ? false : true;
      const response = await DriverAPI.toggleAvailability('driver_1', newStatus);
      
      if (response.success) {
        setDriverStatus(newStatus ? 'online' : 'offline');
        Alert.alert('Status Updated', response.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };
  /**
   * Handle ride request acceptance
   */
  const acceptRideRequest = async (requestId) => {
    try {
      const response = await DriverAPI.respondToRideRequest(requestId, true);
      
      if (response.success) {
        setCurrentRide(response.ride);
        setRideRequests(prev => prev.filter(req => req.id !== requestId));
        setDriverStatus('busy');
        
        Alert.alert(
          'Ride Accepted!',
          'Navigate to pickup location to start the ride',
          [
            { text: 'Navigate', onPress: () => navigation.navigate('Navigation', { ride: response.ride }) },
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept ride request');
    }
  };

  /**
   * Handle refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadDriverData();
    setRefreshing(false);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Status */}
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: driverStatus === 'online' ? Colors.success : 
              driverStatus === 'busy' ? Colors.warning : Colors.error }
          ]} />
          <Text style={styles.statusText}>
            {driverStatus === 'online' ? 'Online - Ready for rides' :
             driverStatus === 'busy' ? 'Busy - On a ride' : 'Offline'}
          </Text>
        </View>
        
        <EcoButton
          title={driverStatus === 'online' ? 'Go Offline' : 'Go Online'}
          onPress={toggleDriverStatus}
          style={[
            styles.statusButton,
            { backgroundColor: driverStatus === 'online' ? Colors.error : Colors.success }
          ]}
          disabled={driverStatus === 'busy'}
        />
      </View>

      {/* Current Ride */}
      {currentRide && (
        <EcoCard style={styles.currentRideCard}>
          <View style={styles.cardHeader}>
            <Icon name="navigation" size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Current Ride</Text>
          </View>
          
          <View style={styles.rideInfo}>
            <Text style={styles.passengerName}>{currentRide.passengerName}</Text>
            <Text style={styles.rideDetails}>
              {currentRide.pickupAddress} → {currentRide.dropoffAddress}
            </Text>
            <Text style={styles.fareAmount}>₹{currentRide.fare}</Text>
          </View>
          
          <EcoButton
            title="Navigate"
            onPress={() => navigation.navigate('Navigation', { ride: currentRide })}
            style={styles.navigateButton}
          />
        </EcoCard>
      )}

      {/* Today's Stats */}
      <EcoCard style={styles.statsCard}>
        <Text style={styles.cardTitle}>Today's Performance</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Icon name="attach-money" size={24} color={Colors.success} />
            <Text style={styles.statValue}>₹{todaysStats.earnings}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="directions-car" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{todaysStats.trips}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="schedule" size={24} color={Colors.warning} />
            <Text style={styles.statValue}>{todaysStats.hours}h</Text>
            <Text style={styles.statLabel}>Online</Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="star" size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{todaysStats.rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>
        
        <View style={styles.ecoImpact}>
          <Icon name="eco" size={20} color={Colors.success} />
          <Text style={styles.ecoText}>
            You've helped save {todaysStats.carbonSaved}kg CO₂ today!
          </Text>
        </View>
      </EcoCard>

      {/* Ride Requests */}
      {rideRequests.length > 0 && driverStatus === 'online' && (
        <EcoCard style={styles.requestsCard}>
          <Text style={styles.cardTitle}>Ride Requests ({rideRequests.length})</Text>
          
          {rideRequests.map((request) => (
            <View key={request.id} style={styles.requestItem}>
              <View style={styles.requestInfo}>
                <Text style={styles.requestDistance}>{request.distance}km away</Text>
                <Text style={styles.requestRoute}>
                  {request.pickupAddress} → {request.dropoffAddress}
                </Text>
                <Text style={styles.requestFare}>₹{request.estimatedFare}</Text>
              </View>
              
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.declineButton]}
                  onPress={() => setRideRequests(prev => 
                    prev.filter(req => req.id !== request.id))}
                >
                  <Icon name="close" size={20} color={Colors.error} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => acceptRideRequest(request.id)}
                >
                  <Icon name="check" size={20} color={Colors.success} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </EcoCard>
      )}

      {/* Quick Actions */}
      <EcoCard style={styles.actionsCard}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        
        <View style={styles.actionsList}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Earnings')}
          >
            <Icon name="trending-up" size={24} color={Colors.primary} />
            <Text style={styles.actionText}>View Earnings</Text>
            <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Rides')}
          >
            <Icon name="history" size={24} color={Colors.primary} />
            <Text style={styles.actionText}>Ride History</Text>
            <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Profile')}
          >
            <Icon name="settings" size={24} color={Colors.primary} />
            <Text style={styles.actionText}>Driver Settings</Text>
            <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </EcoCard>

      {/* Ride Management Component */}
      {currentRide && (
        <RideManagement
          currentRide={currentRide}
          onRideComplete={(completedRide) => {
            setCurrentRide(null);
            setDriverStatus('online');
            loadDriverData();
          }}
          navigation={navigation}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.large,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.small,
  },
  statusText: {
    ...Typography.body,
    fontWeight: '600',
  },
  statusButton: {
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
  },
  currentRideCard: {
    margin: Spacing.medium,
    backgroundColor: Colors.primaryLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  cardTitle: {
    ...Typography.h3,
    marginLeft: Spacing.small,
    color: Colors.textPrimary,
  },
  rideInfo: {
    marginBottom: Spacing.medium,
  },
  passengerName: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.xsmall,
  },
  rideDetails: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xsmall,
  },
  fareAmount: {
    ...Typography.h3,
    color: Colors.success,
  },
  navigateButton: {
    backgroundColor: Colors.primary,
  },
  statsCard: {
    margin: Spacing.medium,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: Spacing.medium,
  },
  statItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: Spacing.medium,
  },
  statValue: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginTop: Spacing.xsmall,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xsmall,
  },
  ecoImpact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.successLight,
    padding: Spacing.medium,
    borderRadius: 8,
  },
  ecoText: {
    ...Typography.body,
    color: Colors.success,
    marginLeft: Spacing.small,
    fontWeight: '600',
  },
  requestsCard: {
    margin: Spacing.medium,
  },
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.medium,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: Spacing.small,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  requestInfo: {
    flex: 1,
  },
  requestDistance: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xsmall,
  },
  requestRoute: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.xsmall,
  },
  requestFare: {
    ...Typography.h4,
    color: Colors.success,
  },
  requestActions: {
    flexDirection: 'row',
    marginLeft: Spacing.medium,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.small,
  },
  acceptButton: {
    backgroundColor: Colors.successLight,
  },
  declineButton: {
    backgroundColor: Colors.errorLight,
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

export default HomeScreen;

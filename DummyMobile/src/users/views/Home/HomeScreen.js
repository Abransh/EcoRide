/**
 * Component: HomeScreen (Rider)
 * Purpose: Main home screen for riders with map, booking options, and eco-impact summary
 * Props: 
 *   - navigation: React Navigation object
 *   - route: Route params including onPersonaChange
 * Dependencies: MapSearch, Booking features, SimulatedApi
 * Data Flow: Displays user location, nearby drivers, recent rides, and eco-impact metrics
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { EcoButton, EcoCard, LoadingSpinner } from '../../../shared/components';
import { Colors, Typography, Spacing, BorderRadius } from '../../../shared/theme';
import MapSearch from '../../features/MapSearch';
import { getUserData, getRecentRides, getEcoImpact } from '../../../shared/api/simulatedApi';

const HomeScreen = ({ navigation, route }) => {
  const { onPersonaChange } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [recentRides, setRecentRides] = useState([]);
  const [ecoImpact, setEcoImpact] = useState(null);
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    loadHomeData();
  }, []);

  /**
   * Load all home screen data
   */
  const loadHomeData = async () => {
    try {
      setLoading(true);
      
      // Get user data from AsyncStorage or API
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const user = JSON.parse(storedUserData);
        setUserData(user);
        
        // Load additional data
        const [ridesResult, impactResult] = await Promise.all([
          getRecentRides(user.id, 'rider'),
          getEcoImpact(user.id, 'rider'),
        ]);
        
        if (ridesResult.success) {
          setRecentRides(ridesResult.rides);
        }
        
        if (impactResult.success) {
          setEcoImpact(impactResult.impact);
        }
      }
    } catch (error) {
      console.error('Error loading home data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle pull-to-refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  /**
   * Handle quick booking
   */
  const handleQuickBook = () => {
    navigation.navigate('Booking');
  };

  /**
   * Handle map search
   */
  const handleMapSearch = () => {
    setMapVisible(true);
  };

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['authToken', 'userData']);
              if (onPersonaChange) {
                onPersonaChange(null);
              }
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading your dashboard..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hello, {userData?.name?.split(' ')[0] || 'Rider'}!</Text>
            <Text style={styles.subGreeting}>Where would you like to go?</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Icon name="logout" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <EcoButton
            title="Book a Ride"
            onPress={handleQuickBook}
            style={styles.quickActionButton}
            icon="directions-car"
          />
          <EcoButton
            title="Search Map"
            onPress={handleMapSearch}
            variant="outline"
            style={styles.quickActionButton}
            icon="map"
          />
        </View>

        {/* Eco Impact Summary */}
        {ecoImpact && (
          <EcoCard style={styles.ecoImpactCard}>
            <View style={styles.cardHeader}>
              <Icon name="eco" size={24} color={Colors.primary} />
              <Text style={styles.cardTitle}>Your Eco Impact</Text>
            </View>
            <View style={styles.impactStats}>
              <View style={styles.impactStat}>
                <Text style={styles.impactValue}>{ecoImpact.carbonSaved}kg</Text>
                <Text style={styles.impactLabel}>CO₂ Saved</Text>
              </View>
              <View style={styles.impactStat}>
                <Text style={styles.impactValue}>{ecoImpact.treesEquivalent}</Text>
                <Text style={styles.impactLabel}>Trees Planted</Text>
              </View>
              <View style={styles.impactStat}>
                <Text style={styles.impactValue}>{ecoImpact.totalRides}</Text>
                <Text style={styles.impactLabel}>Green Rides</Text>
              </View>
            </View>
          </EcoCard>
        )}

        {/* Recent Rides */}
        <EcoCard style={styles.recentRidesCard}>
          <View style={styles.cardHeader}>
            <Icon name="history" size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Recent Rides</Text>
          </View>
          {recentRides.length > 0 ? (
            recentRides.slice(0, 3).map((ride) => (
              <View key={ride.id} style={styles.rideItem}>
                <View style={styles.rideInfo}>
                  <Text style={styles.rideDestination}>
                    {ride.destination.address}
                  </Text>
                  <Text style={styles.rideDate}>
                    {new Date(ride.completedAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.ridePrice}>
                  <Text style={styles.ridePriceText}>${ride.fare}</Text>
                  <View style={[styles.rideStatus, { backgroundColor: getRideStatusColor(ride.status) }]}>
                    <Text style={styles.rideStatusText}>{ride.status}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="directions-car" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyStateText}>No rides yet</Text>
              <Text style={styles.emptyStateSubtext}>Book your first eco-friendly ride!</Text>
            </View>
          )}
        </EcoCard>

        {/* Safety & Features */}
        <EcoCard style={styles.featuresCard}>
          <Text style={styles.cardTitle}>Why Choose EcoRide?</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Icon name="verified" size={20} color={Colors.success} />
              <Text style={styles.featureText}>Verified Eco-Friendly Vehicles</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="security" size={20} color={Colors.success} />
              <Text style={styles.featureText}>Safety First - All Drivers Verified</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="nature" size={20} color={Colors.success} />
              <Text style={styles.featureText}>Carbon Neutral Rides</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="savings" size={20} color={Colors.success} />
              <Text style={styles.featureText}>Competitive Pricing</Text>
            </View>
          </View>
        </EcoCard>
      </ScrollView>

      {/* Map Search Modal/Component */}
      {mapVisible && (
        <MapSearch
          visible={mapVisible}
          onClose={() => setMapVisible(false)}
          onLocationSelect={(location) => {
            setMapVisible(false);
            navigation.navigate('Booking', { destination: location });
          }}
        />
      )}
    </SafeAreaView>
  );
};

/**
 * Helper function to get ride status color
 */
const getRideStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return Colors.success;
    case 'cancelled':
      return Colors.error;
    case 'in-progress':
      return Colors.warning;
    default:
      return Colors.textSecondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.large,
    paddingBottom: Spacing.medium,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...Typography.heading2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xsmall,
  },
  subGreeting: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  logoutButton: {
    padding: Spacing.small,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.large,
    marginBottom: Spacing.large,
    gap: Spacing.medium,
  },
  quickActionButton: {
    flex: 1,
  },
  ecoImpactCard: {
    marginHorizontal: Spacing.large,
    marginBottom: Spacing.large,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  cardTitle: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    marginLeft: Spacing.small,
  },
  impactStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  impactStat: {
    alignItems: 'center',
  },
  impactValue: {
    ...Typography.heading2,
    color: Colors.primary,
    marginBottom: Spacing.xsmall,
  },
  impactLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  recentRidesCard: {
    marginHorizontal: Spacing.large,
    marginBottom: Spacing.large,
  },
  rideItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rideInfo: {
    flex: 1,
  },
  rideDestination: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.xsmall,
  },
  rideDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  ridePrice: {
    alignItems: 'flex-end',
  },
  ridePriceText: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    marginBottom: Spacing.xsmall,
  },
  rideStatus: {
    paddingHorizontal: Spacing.small,
    paddingVertical: 2,
    borderRadius: BorderRadius.small,
  },
  rideStatusText: {
    ...Typography.caption,
    color: Colors.surface,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.large,
  },
  emptyStateText: {
    ...Typography.heading3,
    color: Colors.textSecondary,
    marginTop: Spacing.medium,
  },
  emptyStateSubtext: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.small,
  },
  featuresCard: {
    marginHorizontal: Spacing.large,
    marginBottom: Spacing.large,
  },
  featuresList: {
    marginTop: Spacing.medium,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  featureText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginLeft: Spacing.medium,
    flex: 1,
  },
});

export default HomeScreen;

/**
 * Component: Navigation
 * Purpose: Turn-by-turn navigation for drivers with route optimization and real-time updates
 * Props: 
 *   - route: Navigation route with ride information
 *   - navigation: React Navigation object
 * Dependencies: React Native, Maps, Location Services, SimulatedApi
 * Data Flow: Provides GPS navigation, route updates, and location tracking for active rides
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { EcoCard, EcoButton } from '../../../shared/components';
import { Colors, Typography, Spacing } from '../../../shared/theme';
import { DriverAPI } from '../../../shared/api/simulatedApi';

const { width, height } = Dimensions.get('window');

const Navigation = ({ route, navigation }) => {
  const { ride } = route.params || {};
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [eta, setEta] = useState('');
  const [distanceRemaining, setDistanceRemaining] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeSteps, setRouteSteps] = useState([]);
  const [trafficInfo, setTrafficInfo] = useState({
    condition: 'moderate',
    delay: 0,
  });

  useEffect(() => {
    if (ride) {
      loadNavigationData();
      startNavigation();
    }
  }, [ride]);

  /**
   * Load navigation data and route information
   */
  const loadNavigationData = async () => {
    try {
      const [steps, traffic] = await Promise.all([
        simulatedApi.getNavigationSteps(ride),
        simulatedApi.getTrafficInfo(ride.pickupCoordinates, ride.dropoffCoordinates),
      ]);
      
      setRouteSteps(steps);
      setTrafficInfo(traffic);
      setEta(traffic.eta);
      setDistanceRemaining(traffic.distance);
    } catch (error) {
      console.error('Error loading navigation data:', error);
      Alert.alert('Error', 'Failed to load navigation data');
    }
  };

  /**
   * Start navigation
   */
  const startNavigation = () => {
    setIsNavigating(true);
    
    // Simulate navigation updates
    const interval = setInterval(() => {
      updateNavigationProgress();
    }, 5000);

    return () => clearInterval(interval);
  };

  /**
   * Update navigation progress
   */
  const updateNavigationProgress = async () => {
    try {
      const progress = await simulatedApi.getNavigationProgress();
      setCurrentStep(progress.currentStep);
      setEta(progress.eta);
      setDistanceRemaining(progress.distanceRemaining);
      setCurrentLocation(progress.currentLocation);
    } catch (error) {
      console.error('Error updating navigation:', error);
    }
  };

  /**
   * Open external navigation app
   */
  const openExternalNavigation = () => {
    const destination = ride.dropoffCoordinates;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
    
    Alert.alert(
      'Open Navigation',
      'Choose your preferred navigation app:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Google Maps',
          onPress: () => Linking.openURL(url),
        },
        {
          text: 'Apple Maps',
          onPress: () => Linking.openURL(`maps://app?daddr=${destination.latitude},${destination.longitude}`),
        },
      ]
    );
  };

  /**
   * Report traffic or road issue
   */
  const reportIssue = () => {
    Alert.alert(
      'Report Issue',
      'What would you like to report?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Traffic Jam', onPress: () => reportTrafficIssue('traffic') },
        { text: 'Road Closure', onPress: () => reportTrafficIssue('closure') },
        { text: 'Accident', onPress: () => reportTrafficIssue('accident') },
      ]
    );
  };

  /**
   * Report traffic issue
   */
  const reportTrafficIssue = async (type) => {
    try {
      await simulatedApi.reportTrafficIssue({
        type,
        location: currentLocation,
        rideId: ride.id,
      });
      Alert.alert('Thank You', 'Your report has been submitted');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report');
    }
  };

  /**
   * Get traffic color based on condition
   */
  const getTrafficColor = (condition) => {
    switch (condition) {
      case 'heavy': return Colors.error;
      case 'moderate': return Colors.warning;
      case 'light': return Colors.success;
      default: return Colors.textSecondary;
    }
  };

  /**
   * Format instruction text
   */
  const formatInstruction = (instruction) => {
    return instruction.replace(/(\d+\.?\d*)\s*(km|m|miles|ft)/gi, (match) => {
      return `${match}`;
    });
  };

  if (!ride) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={48} color={Colors.error} />
        <Text style={styles.errorText}>No ride information available</Text>
        <EcoButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={styles.errorButton}
        />
      </View>
    );
  }

  const currentInstruction = routeSteps[currentStep] || {};

  return (
    <View style={styles.container}>
      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Icon name="map" size={64} color={Colors.primary} />
          <Text style={styles.mapText}>Navigation Map</Text>
          <Text style={styles.mapSubtext}>Real-time GPS navigation would be displayed here</Text>
        </View>
        
        {/* Map Overlay Controls */}
        <View style={styles.mapOverlay}>
          <TouchableOpacity
            style={styles.overlayButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={Colors.surface} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.overlayButton}
            onPress={openExternalNavigation}
          >
            <Icon name="open-in-new" size={24} color={Colors.surface} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Info Panel */}
      <View style={styles.navigationPanel}>
        {/* Current Instruction */}
        <EcoCard style={styles.instructionCard}>
          <View style={styles.instructionHeader}>
            <View style={styles.instructionIcon}>
              <Icon 
                name={currentInstruction.icon || 'straight'} 
                size={32} 
                color={Colors.primary} 
              />
            </View>
            <View style={styles.instructionText}>
              <Text style={styles.instructionTitle}>
                {currentInstruction.instruction || 'Continue straight'}
              </Text>
              <Text style={styles.instructionDistance}>
                {currentInstruction.distance || 'in 500m'}
              </Text>
            </View>
          </View>
          
          <View style={styles.instructionDetails}>
            <Text style={styles.instructionDetail}>
              {formatInstruction(currentInstruction.detail || 'Follow the road ahead')}
            </Text>
          </View>
        </EcoCard>

        {/* Journey Progress */}
        <EcoCard style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.progressItem}>
              <Icon name="schedule" size={20} color={Colors.primary} />
              <Text style={styles.progressLabel}>ETA</Text>
              <Text style={styles.progressValue}>{eta}</Text>
            </View>
            
            <View style={styles.progressItem}>
              <Icon name="straighten" size={20} color={Colors.warning} />
              <Text style={styles.progressLabel}>Distance</Text>
              <Text style={styles.progressValue}>{distanceRemaining}</Text>
            </View>
            
            <View style={styles.progressItem}>
              <Icon 
                name="traffic" 
                size={20} 
                color={getTrafficColor(trafficInfo.condition)} 
              />
              <Text style={styles.progressLabel}>Traffic</Text>
              <Text style={[
                styles.progressValue,
                { color: getTrafficColor(trafficInfo.condition) }
              ]}>
                {trafficInfo.condition}
              </Text>
            </View>
          </View>
          
          {trafficInfo.delay > 0 && (
            <View style={styles.delayWarning}>
              <Icon name="warning" size={16} color={Colors.warning} />
              <Text style={styles.delayText}>
                +{trafficInfo.delay} min delay due to traffic
              </Text>
            </View>
          )}
        </EcoCard>

        {/* Ride Information */}
        <EcoCard style={styles.rideInfoCard}>
          <View style={styles.rideInfoHeader}>
            <Text style={styles.rideInfoTitle}>Ride Details</Text>
            <View style={styles.rideInfoBadge}>
              <Text style={styles.rideInfoBadgeText}>{ride.vehicleType}</Text>
            </View>
          </View>
          
          <View style={styles.rideRoute}>
            <View style={styles.routePoint}>
              <Icon name="radio-button-checked" size={16} color={Colors.success} />
              <Text style={styles.routeText}>{ride.pickupAddress}</Text>
            </View>
            
            <View style={styles.routeLine} />
            
            <View style={styles.routePoint}>
              <Icon name="place" size={16} color={Colors.error} />
              <Text style={styles.routeText}>{ride.dropoffAddress}</Text>
            </View>
          </View>
          
          <View style={styles.passengerInfo}>
            <Icon name="person" size={20} color={Colors.primary} />
            <Text style={styles.passengerName}>{ride.passengerName}</Text>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => Linking.openURL(`tel:${ride.passengerPhone || '+919876543210'}`)}
            >
              <Icon name="phone" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </EcoCard>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <EcoButton
            title="Report Issue"
            onPress={reportIssue}
            style={[styles.actionButton, styles.reportButton]}
            variant="outline"
          />
          
          <EcoButton
            title="End Navigation"
            onPress={() => navigation.goBack()}
            style={[styles.actionButton, styles.endButton]}
          />
        </View>

        {/* Eco Tip */}
        <View style={styles.ecoTip}>
          <Icon name="eco" size={16} color={Colors.success} />
          <Text style={styles.ecoTipText}>
            Driving efficiently saves fuel and earns you eco bonuses!
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapContainer: {
    height: height * 0.4,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
  },
  mapText: {
    ...Typography.h3,
    color: Colors.primary,
    marginTop: Spacing.medium,
  },
  mapSubtext: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.small,
    paddingHorizontal: Spacing.large,
  },
  mapOverlay: {
    position: 'absolute',
    top: Spacing.large,
    left: Spacing.medium,
    right: Spacing.medium,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  navigationPanel: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  instructionCard: {
    margin: Spacing.medium,
    backgroundColor: Colors.surface,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  instructionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.medium,
  },
  instructionText: {
    flex: 1,
  },
  instructionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.xsmall,
  },
  instructionDistance: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  instructionDetails: {
    backgroundColor: Colors.background,
    padding: Spacing.medium,
    borderRadius: 8,
  },
  instructionDetail: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  progressCard: {
    marginHorizontal: Spacing.medium,
    marginBottom: Spacing.medium,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressItem: {
    alignItems: 'center',
  },
  progressLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xsmall,
  },
  progressValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginTop: Spacing.xsmall,
  },
  delayWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warningLight,
    padding: Spacing.small,
    borderRadius: 6,
    marginTop: Spacing.medium,
  },
  delayText: {
    ...Typography.caption,
    color: Colors.warning,
    marginLeft: Spacing.xsmall,
  },
  rideInfoCard: {
    marginHorizontal: Spacing.medium,
    marginBottom: Spacing.medium,
  },
  rideInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  rideInfoTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  rideInfoBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.small,
    paddingVertical: 2,
    borderRadius: 12,
  },
  rideInfoBadgeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontSize: 10,
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
    width: 2,
    height: 20,
    backgroundColor: Colors.border,
    marginLeft: 7,
    marginBottom: Spacing.xsmall,
  },
  routeText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginLeft: Spacing.small,
    flex: 1,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.medium,
    borderRadius: 8,
  },
  passengerName: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: Spacing.small,
  },
  contactButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: Spacing.medium,
    marginBottom: Spacing.medium,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: Spacing.small,
  },
  reportButton: {
    backgroundColor: Colors.surface,
    borderColor: Colors.warning,
  },
  endButton: {
    backgroundColor: Colors.error,
  },
  ecoTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    padding: Spacing.medium,
    marginHorizontal: Spacing.medium,
    borderRadius: 8,
  },
  ecoTipText: {
    ...Typography.caption,
    color: Colors.success,
    marginLeft: Spacing.small,
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.large,
  },
  errorText: {
    ...Typography.h4,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.medium,
    marginBottom: Spacing.large,
  },
  errorButton: {
    backgroundColor: Colors.primary,
  },
});

export default Navigation;

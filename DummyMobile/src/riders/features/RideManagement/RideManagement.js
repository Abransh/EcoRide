/**
 * Component: RideManagement
 * Purpose: Handle active ride management including navigation, passenger communication, and ride completion
 * Props: 
 *   - currentRide: Current active ride object
 *   - onRideComplete: Callback when ride is completed
 *   - navigation: React Navigation object
 * Dependencies: React Native, Shared Components, SimulatedApi
 * Data Flow: Manages ride states (pickup, in-progress, completed) and driver actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { EcoCard, EcoButton } from '../../../shared/components';
import { Colors, Typography, Spacing } from '../../../shared/theme';
import { DriverAPI } from '../../../shared/api/simulatedApi';

const RideManagement = ({ currentRide, onRideComplete, navigation }) => {
  const [rideStatus, setRideStatus] = useState('pickup'); // 'pickup', 'in-progress', 'completed'
  const [timer, setTimer] = useState(0);
  const [passengerArrived, setPassengerArrived] = useState(false);

  useEffect(() => {
    if (currentRide && rideStatus === 'in-progress') {
      const interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [currentRide, rideStatus]);
  /**
   * Handle passenger pickup
   */
  const handlePickup = async () => {
    try {
      const response = await DriverAPI.updateRideStatus(currentRide.id, 'in-progress', { latitude: 0, longitude: 0 });
      if (response.success) {
        setRideStatus('in-progress');
        Alert.alert('Pickup Confirmed', 'Ride started. Navigate to destination.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm pickup');
    }
  };
  /**
   * Handle ride completion
   */
  const handleCompleteRide = async () => {
    try {
      const response = await DriverAPI.updateRideStatus(currentRide.id, 'completed', { latitude: 0, longitude: 0 });
      
      if (response.success) {
        setRideStatus('completed');
        
        const completedRide = {
          ...currentRide,
          fare: currentRide.fare,
          duration: timer,
          endTime: new Date().toISOString(),
        };
        
        Alert.alert(
          'Ride Completed!',
          `Fare: ₹${completedRide.fare}\nDuration: ${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')}`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (onRideComplete) {
                  onRideComplete(completedRide);
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete ride');
    }
  };

  /**
   * Call passenger
   */
  const callPassenger = () => {
    const phoneNumber = currentRide.passengerPhone || '+919876543210';
    Linking.openURL(`tel:${phoneNumber}`);
  };

  /**
   * Send message to passenger
   */
  const messagePassenger = () => {
    const phoneNumber = currentRide.passengerPhone || '+919876543210';
    const message = rideStatus === 'pickup' 
      ? 'Hi! I am your EcoRide driver. I have arrived at the pickup location.'
      : 'Thank you for choosing EcoRide! Hope you had a comfortable journey.';
    
    Linking.openURL(`sms:${phoneNumber}?body=${encodeURIComponent(message)}`);
  };

  /**
   * Open navigation to location
   */
  const openNavigation = () => {
    const destination = rideStatus === 'pickup' 
      ? currentRide.pickupCoordinates 
      : currentRide.dropoffCoordinates;
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
    Linking.openURL(url);
  };

  /**
   * Format timer display
   */
  const formatTimer = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!currentRide) {
    return null;
  }

  return (
    <EcoCard style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: rideStatus === 'pickup' ? Colors.warning : Colors.success }
          ]} />
          <Text style={styles.statusText}>
            {rideStatus === 'pickup' ? 'Pickup in Progress' : 
             rideStatus === 'in-progress' ? 'Ride in Progress' : 'Ride Completed'}
          </Text>
        </View>
        
        {rideStatus === 'in-progress' && (
          <View style={styles.timerContainer}>
            <Icon name="schedule" size={16} color={Colors.textSecondary} />
            <Text style={styles.timerText}>{formatTimer(timer)}</Text>
          </View>
        )}
      </View>

      {/* Passenger Information */}
      <View style={styles.passengerInfo}>
        <View style={styles.passengerDetails}>
          <Icon name="person" size={24} color={Colors.primary} />
          <View style={styles.passengerText}>
            <Text style={styles.passengerName}>{currentRide.passengerName}</Text>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={16} color={Colors.accent} />
              <Text style={styles.ratingText}>{currentRide.passengerRating || '4.5'}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.contactButtons}>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={callPassenger}
          >
            <Icon name="phone" size={20} color={Colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.contactButton}
            onPress={messagePassenger}
          >
            <Icon name="message" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Route Information */}
      <View style={styles.routeInfo}>
        <View style={styles.routePoint}>
          <Icon 
            name="radio-button-checked" 
            size={16} 
            color={rideStatus === 'pickup' ? Colors.warning : Colors.success} 
          />
          <View style={styles.routeText}>
            <Text style={styles.routeLabel}>
              {rideStatus === 'pickup' ? 'Pickup Location' : 'From'}
            </Text>
            <Text style={styles.routeAddress}>{currentRide.pickupAddress}</Text>
          </View>
        </View>
        
        <View style={styles.routeLine} />
        
        <View style={styles.routePoint}>
          <Icon 
            name="place" 
            size={16} 
            color={rideStatus === 'in-progress' ? Colors.warning : Colors.textSecondary} 
          />
          <View style={styles.routeText}>
            <Text style={styles.routeLabel}>Destination</Text>
            <Text style={styles.routeAddress}>{currentRide.dropoffAddress}</Text>
          </View>
        </View>
      </View>

      {/* Ride Details */}
      <View style={styles.rideDetails}>
        <View style={styles.detailItem}>
          <Icon name="straighten" size={16} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{currentRide.distance}km</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Icon name="attach-money" size={16} color={Colors.success} />
          <Text style={styles.detailText}>₹{currentRide.fare}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Icon name="directions-car" size={16} color={Colors.primary} />
          <Text style={styles.detailText}>{currentRide.vehicleType}</Text>
        </View>
        
        {currentRide.ecoFriendly && (
          <View style={styles.ecoTag}>
            <Icon name="eco" size={12} color={Colors.success} />
            <Text style={styles.ecoTagText}>Eco</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <EcoButton
          title="Navigate"
          onPress={openNavigation}
          style={[styles.actionButton, styles.navigateButton]}
          variant="outline"
        />
        
        {rideStatus === 'pickup' && (
          <EcoButton
            title="Confirm Pickup"
            onPress={handlePickup}
            style={[styles.actionButton, styles.pickupButton]}
          />
        )}
        
        {rideStatus === 'in-progress' && (
          <EcoButton
            title="Complete Ride"
            onPress={handleCompleteRide}
            style={[styles.actionButton, styles.completeButton]}
          />
        )}
      </View>

      {/* Emergency Actions */}
      <View style={styles.emergencyActions}>
        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={() => Alert.alert('Emergency', 'Emergency services contacted')}
        >
          <Icon name="emergency" size={16} color={Colors.error} />
          <Text style={styles.emergencyText}>Emergency</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={() => Alert.alert('Cancel Ride', 'Ride cancellation initiated')}
        >
          <Icon name="cancel" size={16} color={Colors.warning} />
          <Text style={styles.emergencyText}>Cancel Ride</Text>
        </TouchableOpacity>
      </View>
    </EcoCard>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: Spacing.medium,
    backgroundColor: Colors.primaryLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.small,
  },
  statusText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    borderRadius: 16,
  },
  timerText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginLeft: Spacing.xsmall,
  },
  passengerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.medium,
    borderRadius: 8,
    marginBottom: Spacing.medium,
  },
  passengerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  passengerText: {
    marginLeft: Spacing.medium,
  },
  passengerName: {
    ...Typography.h4,
    color: Colors.textPrimary,
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
  contactButtons: {
    flexDirection: 'row',
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.small,
  },
  routeInfo: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.medium,
    marginBottom: Spacing.medium,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeText: {
    marginLeft: Spacing.medium,
    flex: 1,
  },
  routeLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xsmall,
  },
  routeAddress: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.border,
    marginLeft: 7,
    marginVertical: Spacing.small,
  },
  rideDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.medium,
    borderRadius: 8,
    marginBottom: Spacing.medium,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    marginLeft: Spacing.xsmall,
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
  actionButtons: {
    flexDirection: 'row',
    marginBottom: Spacing.medium,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: Spacing.small,
  },
  navigateButton: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
  },
  pickupButton: {
    backgroundColor: Colors.warning,
  },
  completeButton: {
    backgroundColor: Colors.success,
  },
  emergencyActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.medium,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
  },
  emergencyText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginLeft: Spacing.xsmall,
  },
});

export default RideManagement;

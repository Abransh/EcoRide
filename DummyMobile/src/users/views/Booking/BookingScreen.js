/**
 * Component: BookingScreen (Rider)
 * Purpose: Complete ride booking flow with pickup/destination selection and payment
 * Props: 
 *   - navigation: React Navigation object
 *   - route: Route params including destination from MapSearch
 * Dependencies: Booking feature, Payment feature, SimulatedApi
 * Data Flow: Allows ride booking, shows fare estimates, handles payment processing
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { EcoButton, EcoInput, EcoCard, LoadingSpinner } from '../../../shared/components';
import { Colors, Typography, Spacing, BorderRadius } from '../../../shared/theme';
import BookingFeature from '../../features/Booking';
import PaymentFeature from '../../features/Payment';
import { getFareEstimate, bookRide, getNearbyDrivers } from '../../../shared/api/simulatedApi';

const BookingScreen = ({ navigation, route }) => {
  const { destination } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('locations'); // locations, vehicle, payment, confirmation
  const [userData, setUserData] = useState(null);
  const [bookingData, setBookingData] = useState({
    pickup: null,
    destination: destination || null,
    vehicleType: 'economy',
    paymentMethod: null,
    specialRequests: '',
    scheduledTime: null,
  });
  const [fareEstimate, setFareEstimate] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  useEffect(() => {
    loadUserData();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (bookingData.pickup && bookingData.destination) {
      getFareEstimateData();
    }
  }, [bookingData.pickup, bookingData.destination, bookingData.vehicleType]);

  /**
   * Load user data from storage
   */
  const loadUserData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        setUserData(JSON.parse(storedUserData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  /**
   * Get current location as pickup
   */
  const getCurrentLocation = () => {
    // Simulate getting current location
    setBookingData(prev => ({
      ...prev,
      pickup: {
        id: 'current_location',
        name: 'Current Location',
        address: '123 Current St, San Francisco, CA',
        latitude: 37.7749,
        longitude: -122.4194,
      },
    }));
  };

  /**
   * Get fare estimate based on pickup and destination
   */
  const getFareEstimateData = async () => {
    try {
      setLoading(true);
      
      const result = await getFareEstimate(
        bookingData.pickup,
        bookingData.destination,
        bookingData.vehicleType
      );
      
      if (result.success) {
        setFareEstimate(result.estimate);
      }

      // Also get nearby drivers
      const driversResult = await getNearbyDrivers(
        bookingData.pickup.latitude,
        bookingData.pickup.longitude
      );
      
      if (driversResult.success) {
        setNearbyDrivers(driversResult.drivers);
      }
    } catch (error) {
      console.error('Error getting fare estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle destination selection
   */
  const handleDestinationSelect = (location) => {
    setBookingData(prev => ({
      ...prev,
      destination: location,
    }));
  };

  /**
   * Handle vehicle type selection
   */
  const handleVehicleTypeSelect = (vehicleType) => {
    setBookingData(prev => ({
      ...prev,
      vehicleType,
    }));
  };

  /**
   * Handle payment method selection
   */
  const handlePaymentMethodSelect = (paymentMethod) => {
    setBookingData(prev => ({
      ...prev,
      paymentMethod,
    }));
  };

  /**
   * Navigate to next step
   */
  const handleNextStep = () => {
    switch (currentStep) {
      case 'locations':
        if (!bookingData.destination) {
          Alert.alert('Error', 'Please select a destination');
          return;
        }
        setCurrentStep('vehicle');
        break;
      case 'vehicle':
        setCurrentStep('payment');
        break;
      case 'payment':
        if (!bookingData.paymentMethod) {
          Alert.alert('Error', 'Please select a payment method');
          return;
        }
        handleBookRide();
        break;
    }
  };

  /**
   * Handle ride booking
   */
  const handleBookRide = async () => {
    try {
      setBookingInProgress(true);
      
      const bookingRequest = {
        riderId: userData.id,
        pickup: bookingData.pickup,
        destination: bookingData.destination,
        vehicleType: bookingData.vehicleType,
        paymentMethod: bookingData.paymentMethod,
        specialRequests: bookingData.specialRequests,
        scheduledTime: bookingData.scheduledTime,
        fareEstimate: fareEstimate,
      };

      const result = await bookRide(bookingRequest);
      
      if (result.success) {
        setCurrentStep('confirmation');
        // Navigate to ride tracking screen after a delay
        setTimeout(() => {
          navigation.navigate('Home');
          Alert.alert(
            'Ride Booked!',
            'Your eco-friendly ride has been booked. A driver will be assigned shortly.',
            [{ text: 'OK' }]
          );
        }, 3000);
      } else {
        Alert.alert('Booking Failed', result.message || 'Please try again');
      }
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to book ride. Please try again.');
    } finally {
      setBookingInProgress(false);
    }
  };

  /**
   * Render step indicator
   */
  const renderStepIndicator = () => {
    const steps = ['locations', 'vehicle', 'payment', 'confirmation'];
    const currentIndex = steps.indexOf(currentStep);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <View key={step} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                index <= currentIndex && styles.stepCircleActive,
              ]}
            >
              <Text
                style={[
                  styles.stepText,
                  index <= currentIndex && styles.stepTextActive,
                ]}
              >
                {index + 1}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  index < currentIndex && styles.stepLineActive,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  if (bookingInProgress) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Booking your eco-friendly ride..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Ride</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      <ScrollView style={styles.scrollView}>
        {currentStep === 'locations' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Where are you going?</Text>
            
            {/* Pickup Location */}
            <EcoCard style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <Icon name="my-location" size={20} color={Colors.primary} />
                <Text style={styles.locationLabel}>Pickup Location</Text>
              </View>
              <Text style={styles.locationText}>
                {bookingData.pickup?.address || 'Getting current location...'}
              </Text>
            </EcoCard>

            {/* Destination */}
            <EcoCard style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <Icon name="place" size={20} color={Colors.error} />
                <Text style={styles.locationLabel}>Destination</Text>
              </View>
              {bookingData.destination ? (
                <Text style={styles.locationText}>
                  {bookingData.destination.address}
                </Text>
              ) : (
                <TouchableOpacity
                  style={styles.selectLocationButton}
                  onPress={() => navigation.navigate('MapSearch', {
                    onLocationSelect: handleDestinationSelect
                  })}
                >
                  <Text style={styles.selectLocationText}>
                    Tap to select destination
                  </Text>
                </TouchableOpacity>
              )}
            </EcoCard>

            {/* Special Requests */}
            <EcoInput
              label="Special Requests (Optional)"
              value={bookingData.specialRequests}
              onChangeText={(text) =>
                setBookingData(prev => ({ ...prev, specialRequests: text }))
              }
              placeholder="e.g., Child seat, wheelchair accessible..."
              multiline
              style={styles.specialRequestsInput}
            />
          </View>
        )}

        {currentStep === 'vehicle' && (
          <BookingFeature
            onVehicleTypeSelect={handleVehicleTypeSelect}
            selectedVehicleType={bookingData.vehicleType}
            fareEstimate={fareEstimate}
            nearbyDrivers={nearbyDrivers}
          />
        )}

        {currentStep === 'payment' && (
          <PaymentFeature
            onPaymentMethodSelect={handlePaymentMethodSelect}
            selectedPaymentMethod={bookingData.paymentMethod}
            fareEstimate={fareEstimate}
          />
        )}

        {currentStep === 'confirmation' && (
          <View style={styles.confirmationContent}>
            <Icon name="check-circle" size={80} color={Colors.success} />
            <Text style={styles.confirmationTitle}>Ride Booked!</Text>
            <Text style={styles.confirmationText}>
              Your eco-friendly ride has been confirmed.
            </Text>
            <Text style={styles.confirmationSubtext}>
              A driver will be assigned shortly and you'll receive updates.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      {currentStep !== 'confirmation' && (
        <View style={styles.bottomAction}>
          {fareEstimate && currentStep !== 'locations' && (
            <View style={styles.fareInfo}>
              <Text style={styles.fareLabel}>Estimated Fare:</Text>
              <Text style={styles.fareAmount}>${fareEstimate.total}</Text>
            </View>
          )}
          <EcoButton
            title={
              currentStep === 'payment' ? 'Book Ride' : 'Continue'
            }
            onPress={handleNextStep}
            loading={loading}
            disabled={currentStep === 'locations' && !bookingData.destination}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.large,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.small,
  },
  headerTitle: {
    ...Typography.heading2,
    color: Colors.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.large,
    paddingHorizontal: Spacing.large,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
  },
  stepText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  stepTextActive: {
    color: Colors.surface,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.small,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: Spacing.large,
  },
  stepTitle: {
    ...Typography.heading2,
    color: Colors.textPrimary,
    marginBottom: Spacing.large,
    textAlign: 'center',
  },
  locationCard: {
    marginBottom: Spacing.medium,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  locationLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    marginLeft: Spacing.small,
  },
  locationText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.large,
  },
  selectLocationButton: {
    paddingVertical: Spacing.medium,
    paddingHorizontal: Spacing.large,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    marginLeft: Spacing.large,
  },
  selectLocationText: {
    ...Typography.body,
    color: Colors.primary,
    textAlign: 'center',
  },
  specialRequestsInput: {
    marginTop: Spacing.medium,
  },
  confirmationContent: {
    alignItems: 'center',
    padding: Spacing.xlarge,
    paddingTop: Spacing.xxxlarge,
  },
  confirmationTitle: {
    ...Typography.heading1,
    color: Colors.success,
    marginTop: Spacing.large,
    marginBottom: Spacing.medium,
  },
  confirmationText: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.small,
  },
  confirmationSubtext: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  bottomAction: {
    padding: Spacing.large,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  fareInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  fareLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  fareAmount: {
    ...Typography.heading3,
    color: Colors.primary,
    fontWeight: 'bold',
  },
});

export default BookingScreen;

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Dimensions,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

// Redux
import { selectAuth } from '../../store/slices/authSlice';

// Constants
import { COLORS } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(selectAuth);

  // Map and location state
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [destination, setDestination] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('bike'); // 'bike' or 'car'
  const [estimatedFare, setEstimatedFare] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);

  // Map ref
  const mapRef = useRef(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Get current location
  const getCurrentLocation = async () => {
    try {
      // Request location permission
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Required', 'Location permission is required to show your current location.');
          return;
        }
      }

      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = {
            latitude,
            longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.0121,
          };
          
          setCurrentLocation({ latitude, longitude });
          setMapRegion(location);
          
          // Animate map to current location
          if (mapRef.current) {
            mapRef.current.animateToRegion(location, 1000);
          }
        },
        (error) => {
          console.error('Location error:', error);
          Alert.alert('Location Error', 'Unable to get your current location. Please try again.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  // Handle vehicle selection
  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
    calculateFare(vehicle);
  };

  // Calculate estimated fare
  const calculateFare = (vehicle) => {
    // Simple fare calculation based on distance (mock implementation)
    // In real app, this would use Google Directions API
    const mockDistance = 5.2; // km
    
    let fare;
    if (vehicle === 'bike') {
      const baseFare = 15;
      const additionalKm = Math.max(0, mockDistance - 1);
      fare = baseFare + (additionalKm * 6);
    } else {
      const baseFare = 30;
      const additionalKm = Math.max(0, mockDistance - 2);
      fare = baseFare + (additionalKm * 15);
    }
    
    setEstimatedFare({
      amount: Math.round(fare),
      distance: mockDistance,
      duration: Math.round(mockDistance * 3), // 3 mins per km estimate
    });
  };

  // Handle ride booking
  const handleBookRide = () => {
    if (!destination.trim()) {
      Alert.alert('Destination Required', 'Please enter your destination.');
      return;
    }

    navigation.navigate('RideBooking', {
      pickup: currentLocation,
      destination: destination,
      vehicleType: selectedVehicle,
      estimatedFare: estimatedFare,
    });
  };

  // Handle profile navigation
  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  // Handle subscription navigation
  const handleSubscriptionPress = () => {
    navigation.navigate('Subscription');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.WHITE} />
      
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsTraffic={false}
        onRegionChangeComplete={setMapRegion}
      >
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            pinColor={COLORS.PRIMARY}
          />
        )}
        
        {/* Nearby Drivers (Mock data) */}
        {nearbyDrivers.map((driver, index) => (
          <Marker
            key={index}
            coordinate={driver.location}
            title={`${driver.vehicleType} Driver`}
            pinColor={driver.vehicleType === 'bike' ? COLORS.BIKE_COLOR : COLORS.CAR_COLOR}
          />
        ))}
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hello, {user?.name || 'User'}! 👋</Text>
          <Text style={styles.subGreeting}>Where would you like to go?</Text>
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
          <Icon name="person" size={24} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Destination Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color={COLORS.TEXT_SECONDARY} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where to?"
            value={destination}
            onChangeText={setDestination}
            placeholderTextColor={COLORS.TEXT_SECONDARY}
          />
          {destination ? (
            <TouchableOpacity onPress={() => setDestination('')}>
              <Icon name="clear" size={20} color={COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Vehicle Selection */}
        <View style={styles.vehicleSection}>
          <Text style={styles.sectionTitle}>Choose Vehicle</Text>
          <View style={styles.vehicleOptions}>
            {/* Bike Option */}
            <TouchableOpacity
              style={[
                styles.vehicleOption,
                selectedVehicle === 'bike' ? styles.vehicleOptionSelected : {},
              ]}
              onPress={() => handleVehicleSelect('bike')}
            >
              <View style={styles.vehicleIcon}>
                <Icon 
                  name="two-wheeler" 
                  size={24} 
                  color={selectedVehicle === 'bike' ? COLORS.WHITE : COLORS.BIKE_COLOR} 
                />
              </View>
              <View style={styles.vehicleInfo}>
                <Text style={[
                  styles.vehicleName,
                  selectedVehicle === 'bike' ? styles.textSelected : {},
                ]}>
                  Eco Bike
                </Text>
                <Text style={[
                  styles.vehicleDesc,
                  selectedVehicle === 'bike' ? styles.textSelected : {},
                ]}>
                  2 mins away
                </Text>
              </View>
              <Text style={[
                styles.vehiclePrice,
                selectedVehicle === 'bike' ? styles.textSelected : {},
              ]}>
                ₹15
              </Text>
            </TouchableOpacity>

            {/* Car Option */}
            <TouchableOpacity
              style={[
                styles.vehicleOption,
                selectedVehicle === 'car' ? styles.vehicleOptionSelected : {},
              ]}
              onPress={() => handleVehicleSelect('car')}
            >
              <View style={styles.vehicleIcon}>
                <Icon 
                  name="directions-car" 
                  size={24} 
                  color={selectedVehicle === 'car' ? COLORS.WHITE : COLORS.CAR_COLOR} 
                />
              </View>
              <View style={styles.vehicleInfo}>
                <Text style={[
                  styles.vehicleName,
                  selectedVehicle === 'car' ? styles.textSelected : {},
                ]}>
                  Eco Car
                </Text>
                <Text style={[
                  styles.vehicleDesc,
                  selectedVehicle === 'car' ? styles.textSelected : {},
                ]}>
                  4 mins away
                </Text>
              </View>
              <Text style={[
                styles.vehiclePrice,
                selectedVehicle === 'car' ? styles.textSelected : {},
              ]}>
                ₹30
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Fare Estimate */}
        {estimatedFare && (
          <View style={styles.fareSection}>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Estimated Fare</Text>
              <Text style={styles.fareAmount}>₹{estimatedFare.amount}</Text>
            </View>
            <View style={styles.fareDetails}>
              <Text style={styles.fareDetail}>
                {estimatedFare.distance} km • {estimatedFare.duration} mins
              </Text>
              <View style={styles.ecoImpact}>
                <Icon name="eco" size={16} color={COLORS.SUCCESS} />
                <Text style={styles.ecoText}>~0.5 kg CO2 saved</Text>
              </View>
            </View>
          </View>
        )}

        {/* Book Ride Button */}
        <TouchableOpacity
          style={[
            styles.bookButton,
            !destination.trim() ? styles.bookButtonDisabled : {},
          ]}
          onPress={handleBookRide}
          disabled={!destination.trim()}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              !destination.trim()
                ? [COLORS.TEXT_DISABLED, COLORS.TEXT_DISABLED]
                : COLORS.GRADIENT_PRIMARY
            }
            style={styles.bookButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.bookButtonText}>Book Eco Ride</Text>
            <Icon name="arrow-forward" size={20} color={COLORS.WHITE} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Subscription CTA */}
        <TouchableOpacity
          style={styles.subscriptionCTA}
          onPress={handleSubscriptionPress}
          activeOpacity={0.7}
        >
          <View style={styles.subscriptionContent}>
            <Icon name="card-membership" size={24} color={COLORS.ACCENT} />
            <View style={styles.subscriptionText}>
              <Text style={styles.subscriptionTitle}>Save with Monthly Plans</Text>
              <Text style={styles.subscriptionDesc}>Starting from ₹500/month</Text>
            </View>
            <Icon name="chevron-right" size={20} color={COLORS.TEXT_SECONDARY} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Current Location Button */}
      <TouchableOpacity
        style={styles.currentLocationButton}
        onPress={getCurrentLocation}
        activeOpacity={0.8}
      >
        <Icon name="my-location" size={24} color={COLORS.PRIMARY} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  searchContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    elevation: 3,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: 10,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  vehicleSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 15,
  },
  vehicleOptions: {
    gap: 12,
  },
  vehicleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.WHITE,
  },
  vehicleOptionSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY,
  },
  vehicleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  vehicleDesc: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  vehiclePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  textSelected: {
    color: COLORS.WHITE,
  },
  fareSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fareLabel: {
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
  },
  fareAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  fareDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareDetail: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  ecoImpact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ecoText: {
    fontSize: 12,
    color: COLORS.SUCCESS,
    marginLeft: 4,
    fontWeight: '500',
  },
  bookButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 3,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bookButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
  },
  bookButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginRight: 8,
  },
  subscriptionCTA: {
    backgroundColor: COLORS.ACCENT_LIGHT,
    borderRadius: 12,
    padding: 15,
  },
  subscriptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionText: {
    flex: 1,
    marginLeft: 12,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  subscriptionDesc: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
  },
  currentLocationButton: {
    position: 'absolute',
    right: 20,
    bottom: 250,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default HomeScreen;
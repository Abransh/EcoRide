/**
 * Component: MapSearch
 * Purpose: Map-based location search and selection for riders
 * Props: 
 *   - visible: Boolean to control modal visibility
 *   - onClose: Function called when modal is closed
 *   - onLocationSelect: Function called when location is selected
 * Dependencies: React Native Maps (simulated), SimulatedApi
 * Data Flow: Shows map with current location, allows search and location selection
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { EcoButton, EcoInput, EcoCard, LoadingSpinner } from '../../../shared/components';
import { Colors, Typography, Spacing, BorderRadius } from '../../../shared/theme';
import { searchLocations, getNearbyDrivers } from '../../../shared/api/simulatedApi';

const MapSearch = ({ visible, onClose, onLocationSelect }) => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    address: 'San Francisco, CA',
  });

  useEffect(() => {
    if (visible) {
      loadMapData();
    }
  }, [visible]);

  /**
   * Load initial map data including nearby drivers
   */
  const loadMapData = async () => {
    try {
      setLoading(true);
      
      // Simulate getting current location
      // In a real app, you'd use Geolocation API
      
      // Get nearby drivers
      const driversResult = await getNearbyDrivers(
        currentLocation.latitude,
        currentLocation.longitude
      );
      
      if (driversResult.success) {
        setNearbyDrivers(driversResult.drivers);
      }
    } catch (error) {
      console.error('Error loading map data:', error);
      Alert.alert('Error', 'Failed to load map data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle location search
   */
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const results = await searchLocations(query);
      
      if (results.success) {
        setSearchResults(results.locations);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle location selection
   */
  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
  };

  /**
   * Confirm location selection
   */
  const confirmLocationSelection = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    }
  };

  /**
   * Use current location
   */
  const useCurrentLocation = () => {
    setSelectedLocation(currentLocation);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Location</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <EcoInput
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              handleSearch(text);
            }}
            placeholder="Search for places..."
            leftIcon="search"
            style={styles.searchInput}
          />
        </View>

        {/* Map Area (Simulated) */}
        <View style={styles.mapContainer}>
          <View style={styles.simulatedMap}>
            <Text style={styles.mapText}>🗺️ Interactive Map</Text>
            <Text style={styles.mapSubtext}>
              Current Location: {currentLocation.address}
            </Text>
            
            {/* Current Location Marker */}
            <View style={[styles.marker, styles.currentLocationMarker]}>
              <Icon name="my-location" size={20} color={Colors.primary} />
            </View>

            {/* Selected Location Marker */}
            {selectedLocation && (
              <View style={[styles.marker, styles.selectedLocationMarker]}>
                <Icon name="place" size={24} color={Colors.error} />
              </View>
            )}

            {/* Nearby Drivers */}
            {nearbyDrivers.slice(0, 3).map((driver, index) => (
              <View
                key={driver.id}
                style={[
                  styles.driverMarker,
                  { top: 100 + index * 30, left: 50 + index * 40 }
                ]}
              >
                <Icon name="directions-car" size={16} color={Colors.success} />
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={styles.mapActions}>
            <TouchableOpacity
              style={styles.mapActionButton}
              onPress={useCurrentLocation}
            >
              <Icon name="my-location" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Results or Location Info */}
        <View style={styles.bottomContainer}>
          {loading ? (
            <LoadingSpinner message="Searching..." />
          ) : searchResults.length > 0 ? (
            <ScrollView style={styles.searchResults}>
              <Text style={styles.resultsTitle}>Search Results</Text>
              {searchResults.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.locationItem,
                    selectedLocation?.id === location.id && styles.selectedLocationItem
                  ]}
                  onPress={() => handleLocationSelect(location)}
                >
                  <Icon name="place" size={20} color={Colors.textSecondary} />
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>{location.name}</Text>
                    <Text style={styles.locationAddress}>{location.address}</Text>
                  </View>
                  {selectedLocation?.id === location.id && (
                    <Icon name="check" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : selectedLocation ? (
            <EcoCard style={styles.selectedLocationCard}>
              <View style={styles.selectedLocationInfo}>
                <Icon name="place" size={24} color={Colors.primary} />
                <View style={styles.selectedLocationText}>
                  <Text style={styles.selectedLocationName}>
                    {selectedLocation.name || 'Selected Location'}
                  </Text>
                  <Text style={styles.selectedLocationAddress}>
                    {selectedLocation.address}
                  </Text>
                </View>
              </View>
              <EcoButton
                title="Confirm Location"
                onPress={confirmLocationSelection}
                style={styles.confirmButton}
              />
            </EcoCard>
          ) : (
            <EcoCard style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>How to select a location:</Text>
              <Text style={styles.instructionsText}>
                • Search for a place using the search bar above{'\n'}
                • Tap on a search result to select it{'\n'}
                • Use the location button to select your current location{'\n'}
                • Tap "Confirm Location" to proceed
              </Text>
            </EcoCard>
          )}
        </View>

        {/* Nearby Drivers Info */}
        {nearbyDrivers.length > 0 && (
          <View style={styles.driversInfo}>
            <Text style={styles.driversInfoText}>
              {nearbyDrivers.length} eco-friendly driver{nearbyDrivers.length !== 1 ? 's' : ''} nearby
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
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
    width: 40, // Balance the back button
  },
  searchContainer: {
    padding: Spacing.large,
    paddingBottom: Spacing.medium,
  },
  searchInput: {
    marginBottom: 0,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  simulatedMap: {
    flex: 1,
    backgroundColor: '#f0f8f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRadius: BorderRadius.medium,
    margin: Spacing.medium,
  },
  mapText: {
    fontSize: 24,
    marginBottom: Spacing.small,
  },
  mapSubtext: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  marker: {
    position: 'absolute',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 15,
    elevation: 3,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  currentLocationMarker: {
    top: '50%',
    left: '50%',
    marginTop: -15,
    marginLeft: -15,
  },
  selectedLocationMarker: {
    top: '30%',
    left: '60%',
    marginTop: -15,
    marginLeft: -15,
  },
  driverMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.success,
    borderRadius: 12,
  },
  mapActions: {
    position: 'absolute',
    bottom: Spacing.large,
    right: Spacing.large,
  },
  mapActionButton: {
    width: 50,
    height: 50,
    backgroundColor: Colors.surface,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bottomContainer: {
    maxHeight: '40%',
    backgroundColor: Colors.surface,
  },
  searchResults: {
    maxHeight: 250,
  },
  resultsTitle: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    padding: Spacing.large,
    paddingBottom: Spacing.medium,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.large,
    paddingVertical: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectedLocationItem: {
    backgroundColor: Colors.primaryLight,
  },
  locationInfo: {
    flex: 1,
    marginLeft: Spacing.medium,
  },
  locationName: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  locationAddress: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xsmall,
  },
  selectedLocationCard: {
    margin: Spacing.large,
  },
  selectedLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  selectedLocationText: {
    flex: 1,
    marginLeft: Spacing.medium,
  },
  selectedLocationName: {
    ...Typography.heading3,
    color: Colors.textPrimary,
  },
  selectedLocationAddress: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xsmall,
  },
  confirmButton: {
    marginTop: Spacing.medium,
  },
  instructionsCard: {
    margin: Spacing.large,
  },
  instructionsTitle: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    marginBottom: Spacing.medium,
  },
  instructionsText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  driversInfo: {
    padding: Spacing.medium,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
  },
  driversInfoText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: 'bold',
  },
});

export default MapSearch;

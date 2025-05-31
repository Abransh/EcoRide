/**
 * Component: BookingFeature
 * Purpose: Vehicle type selection and ride options for booking
 * Props: 
 *   - onVehicleTypeSelect: Function called when vehicle type is selected
 *   - selectedVehicleType: Currently selected vehicle type
 *   - fareEstimate: Fare estimate data from API
 *   - nearbyDrivers: Array of nearby drivers
 * Dependencies: SimulatedApi, SharedComponents
 * Data Flow: Shows vehicle options, fare estimates, and driver availability
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { EcoCard } from '../../../shared/components';
import { Colors, Typography, Spacing, BorderRadius } from '../../../shared/theme';

const VEHICLE_TYPES = [
  {
    id: 'economy',
    name: 'EcoRide Economy',
    description: 'Affordable eco-friendly rides',
    icon: 'directions-car',
    capacity: '1-4 passengers',
    features: ['Hybrid/Electric', 'Standard comfort', 'Most affordable'],
    multiplier: 1.0,
  },
  {
    id: 'comfort',
    name: 'EcoRide Comfort',
    description: 'Premium eco-friendly experience',
    icon: 'airline-seat-recline-extra',
    capacity: '1-4 passengers',
    features: ['Premium Electric', 'Extra legroom', 'Climate control'],
    multiplier: 1.3,
  },
  {
    id: 'green',
    name: 'EcoRide Green+',
    description: '100% electric vehicles only',
    icon: 'eco',
    capacity: '1-4 passengers',
    features: ['100% Electric', 'Zero emissions', 'Green certified'],
    multiplier: 1.1,
  },
  {
    id: 'xl',
    name: 'EcoRide XL',
    description: 'Spacious eco-friendly rides',
    icon: 'airport-shuttle',
    capacity: '1-6 passengers',
    features: ['Large Electric/Hybrid', 'Extra space', 'Group friendly'],
    multiplier: 1.5,
  },
];

const BookingFeature = ({
  onVehicleTypeSelect,
  selectedVehicleType,
  fareEstimate,
  nearbyDrivers,
}) => {
  /**
   * Calculate fare for vehicle type
   */
  const calculateFare = (vehicleType) => {
    if (!fareEstimate) return null;
    
    const vehicle = VEHICLE_TYPES.find(v => v.id === vehicleType.id);
    const baseFare = fareEstimate.baseFare || 0;
    const distanceFare = fareEstimate.distanceFare || 0;
    const timeFare = fareEstimate.timeFare || 0;
    
    const total = (baseFare + distanceFare + timeFare) * vehicle.multiplier;
    return {
      total: total.toFixed(2),
      estimatedTime: fareEstimate.estimatedTime || '5-10 mins',
    };
  };

  /**
   * Get available drivers for vehicle type
   */
  const getAvailableDrivers = (vehicleType) => {
    return nearbyDrivers.filter(driver => 
      driver.vehicleType === vehicleType.id || 
      vehicleType.id === 'economy'
    ).length;
  };

  /**
   * Handle vehicle selection
   */
  const handleVehicleSelect = (vehicleType) => {
    onVehicleTypeSelect(vehicleType.id);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your eco-friendly ride</Text>
      
      <ScrollView style={styles.vehicleList}>
        {VEHICLE_TYPES.map((vehicleType) => {
          const isSelected = selectedVehicleType === vehicleType.id;
          const fare = calculateFare(vehicleType);
          const availableDrivers = getAvailableDrivers(vehicleType);
          
          return (
            <TouchableOpacity
              key={vehicleType.id}
              style={[
                styles.vehicleCard,
                isSelected && styles.selectedVehicleCard,
              ]}
              onPress={() => handleVehicleSelect(vehicleType)}
            >
              <EcoCard style={styles.vehicleCardInner}>
                <View style={styles.vehicleHeader}>
                  <View style={styles.vehicleIconContainer}>
                    <Icon
                      name={vehicleType.icon}
                      size={32}
                      color={isSelected ? Colors.primary : Colors.textSecondary}
                    />
                  </View>
                  <View style={styles.vehicleInfo}>
                    <Text style={[
                      styles.vehicleName,
                      isSelected && styles.selectedText
                    ]}>
                      {vehicleType.name}
                    </Text>
                    <Text style={styles.vehicleDescription}>
                      {vehicleType.description}
                    </Text>
                    <Text style={styles.vehicleCapacity}>
                      {vehicleType.capacity}
                    </Text>
                  </View>
                  <View style={styles.vehiclePricing}>
                    {fare && (
                      <>
                        <Text style={[
                          styles.vehiclePrice,
                          isSelected && styles.selectedText
                        ]}>
                          ${fare.total}
                        </Text>
                        <Text style={styles.vehicleTime}>
                          {fare.estimatedTime}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Vehicle Features */}
                <View style={styles.vehicleFeatures}>
                  {vehicleType.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Icon
                        name="check"
                        size={16}
                        color={isSelected ? Colors.primary : Colors.success}
                      />
                      <Text style={[
                        styles.featureText,
                        isSelected && styles.selectedText
                      ]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Driver Availability */}
                <View style={styles.driverAvailability}>
                  <Icon
                    name="person"
                    size={16}
                    color={availableDrivers > 0 ? Colors.success : Colors.warning}
                  />
                  <Text style={[
                    styles.driverAvailabilityText,
                    { color: availableDrivers > 0 ? Colors.success : Colors.warning }
                  ]}>
                    {availableDrivers > 0 
                      ? `${availableDrivers} driver${availableDrivers !== 1 ? 's' : ''} nearby`
                      : 'Limited availability'
                    }
                  </Text>
                </View>

                {/* Selection Indicator */}
                {isSelected && (
                  <View style={styles.selectionIndicator}>
                    <Icon name="check-circle" size={24} color={Colors.primary} />
                  </View>
                )}
              </EcoCard>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Eco Impact Info */}
      <EcoCard style={styles.ecoInfoCard}>
        <View style={styles.ecoInfoHeader}>
          <Icon name="eco" size={24} color={Colors.success} />
          <Text style={styles.ecoInfoTitle}>Environmental Impact</Text>
        </View>
        <Text style={styles.ecoInfoText}>
          All our vehicles are hybrid or electric, helping reduce CO₂ emissions by up to 80% 
          compared to traditional rides. Choose EcoRide and make a difference!
        </Text>
        <View style={styles.ecoStats}>
          <View style={styles.ecoStat}>
            <Text style={styles.ecoStatValue}>2.5kg</Text>
            <Text style={styles.ecoStatLabel}>CO₂ saved</Text>
          </View>
          <View style={styles.ecoStat}>
            <Text style={styles.ecoStatValue}>95%</Text>
            <Text style={styles.ecoStatLabel}>Less pollution</Text>
          </View>
        </View>
      </EcoCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.large,
  },
  title: {
    ...Typography.heading2,
    color: Colors.textPrimary,
    marginBottom: Spacing.large,
    textAlign: 'center',
  },
  vehicleList: {
    flex: 1,
  },
  vehicleCard: {
    marginBottom: Spacing.medium,
  },
  selectedVehicleCard: {
    transform: [{ scale: 1.02 }],
  },
  vehicleCardInner: {
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedVehicleCard: {
    borderColor: Colors.primary,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.medium,
  },
  vehicleIconContainer: {
    width: 50,
    alignItems: 'center',
    marginRight: Spacing.medium,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    marginBottom: Spacing.xsmall,
  },
  vehicleDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xsmall,
  },
  vehicleCapacity: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  vehiclePricing: {
    alignItems: 'flex-end',
  },
  vehiclePrice: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  vehicleTime: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xsmall,
  },
  selectedText: {
    color: Colors.primary,
  },
  vehicleFeatures: {
    marginBottom: Spacing.medium,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xsmall,
  },
  featureText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginLeft: Spacing.small,
  },
  driverAvailability: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  driverAvailabilityText: {
    ...Typography.caption,
    marginLeft: Spacing.small,
    fontWeight: 'bold',
  },
  selectionIndicator: {
    position: 'absolute',
    top: Spacing.medium,
    right: Spacing.medium,
  },
  ecoInfoCard: {
    marginTop: Spacing.large,
    backgroundColor: Colors.successLight,
  },
  ecoInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  ecoInfoTitle: {
    ...Typography.heading3,
    color: Colors.success,
    marginLeft: Spacing.small,
  },
  ecoInfoText: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: Spacing.medium,
  },
  ecoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ecoStat: {
    alignItems: 'center',
  },
  ecoStatValue: {
    ...Typography.heading3,
    color: Colors.success,
    fontWeight: 'bold',
  },
  ecoStatLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xsmall,
  },
});

export default BookingFeature;

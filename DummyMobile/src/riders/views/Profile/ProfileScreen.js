/**
 * Component: ProfileScreen (Driver)
 * Purpose: Driver profile management with vehicle info, earnings, and app settings
 * Props: 
 *   - navigation: React Navigation object for screen transitions
 *   - route: Route params including onPersonaChange function
 * Dependencies: React Native, Shared Components, AsyncStorage
 * Data Flow: Manages driver profile, vehicle details, settings, and persona switching
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EcoCard, EcoButton, EcoInput, LoadingSpinner } from '../../../shared/components';
import { Colors, Typography, Spacing } from '../../../shared/theme';
import { AuthAPI, DriverAPI } from '../../../shared/api/simulatedApi';

const ProfileScreen = ({ navigation, route }) => {
  const { onPersonaChange } = route.params || {};
  
  const [driverProfile, setDriverProfile] = useState({
    name: '',
    email: '',
    phone: '',
    rating: 0,
    totalRides: 0,
    joinDate: '',
    profileImage: null,
  });
  
  const [vehicleInfo, setVehicleInfo] = useState({
    make: '',
    model: '',
    year: '',
    licensePlate: '',
    color: '',
    vehicleType: '',
    isEcoFriendly: false,
    fuelType: '',
  });
  
  const [settings, setSettings] = useState({
    notifications: true,
    locationSharing: true,
    autoAcceptRides: false,
    ecoMode: true,
    darkMode: false,
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  useEffect(() => {
    loadDriverProfile();
  }, []);
  /**
   * Load driver profile data
   */
  const loadDriverProfile = async () => {
    try {
      setIsLoading(true);
      const userData = await AsyncStorage.getItem('userData');
      const savedSettings = await AsyncStorage.getItem('driverSettings');
      
      if (userData) {
        const user = JSON.parse(userData);
        setDriverProfile({
          name: user.name,
          email: user.email,
          phone: user.phone,
          rating: user.rating || 4.9,
          totalRides: user.totalRides || 342,
          joinDate: 'March 2023',
          profileImage: user.profileImage,
        });
        
        if (user.vehicle) {
          setVehicleInfo(user.vehicle);
        }
      }
        if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading driver profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };
  /**
   * Save profile changes
   */
  const saveProfile = async () => {
    try {
      // Update user data in AsyncStorage
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const updatedUser = { ...user, ...driverProfile };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      }
      
      await AsyncStorage.setItem('driverSettings', JSON.stringify(settings));
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };
  /**
   * Save vehicle information
   */
  const saveVehicleInfo = async () => {
    try {
      const response = await DriverAPI.updateVehicleInfo('driver_1', vehicleInfo);
      if (response.success) {
        // Update local user data
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          user.vehicle = vehicleInfo;
          await AsyncStorage.setItem('userData', JSON.stringify(user));
        }
        
        setShowVehicleModal(false);
        Alert.alert('Success', 'Vehicle information updated');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update vehicle information');
    }
  };

  /**
   * Handle setting change
   */
  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
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
              await AsyncStorage.multiRemove(['authToken', 'userData', 'userPersona']);
              if (onPersonaChange) {
                onPersonaChange(null);
              }
            } catch (error) {
              console.error('Error during logout:', error);
            }
          },
        },
      ]
    );
  };

  /**
   * Switch to rider mode
   */
  const switchToRider = () => {
    Alert.alert(
      'Switch to Rider Mode',
      'Are you sure you want to switch to rider mode?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: () => {
            if (onPersonaChange) {
              onPersonaChange('rider');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <EcoCard style={styles.headerCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Icon name="account-circle" size={80} color={Colors.primary} />
            <TouchableOpacity style={styles.editAvatarButton}>
              <Icon name="camera-alt" size={16} color={Colors.surface} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.driverName}>{driverProfile.name}</Text>
            <Text style={styles.driverEmail}>{driverProfile.email}</Text>
            
            <View style={styles.ratingContainer}>
              <Icon name="star" size={20} color={Colors.accent} />
              <Text style={styles.ratingText}>{driverProfile.rating}</Text>
              <Text style={styles.ratingSubtext}>({driverProfile.totalRides} rides)</Text>
            </View>
            
            <Text style={styles.joinDate}>
              Driver since {driverProfile.joinDate}
            </Text>
          </View>
        </View>
        
        <EcoButton
          title={isEditing ? 'Save Changes' : 'Edit Profile'}
          onPress={isEditing ? saveProfile : () => setIsEditing(true)}
          style={styles.editButton}
          variant={isEditing ? 'primary' : 'outline'}
        />
      </EcoCard>

      {/* Profile Form */}
      {isEditing && (
        <EcoCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <EcoInput
            label="Full Name"
            value={driverProfile.name}
            onChangeText={(text) => setDriverProfile(prev => ({ ...prev, name: text }))}
            placeholder="Enter your full name"
          />
          
          <EcoInput
            label="Email"
            value={driverProfile.email}
            onChangeText={(text) => setDriverProfile(prev => ({ ...prev, email: text }))}
            placeholder="Enter your email"
            keyboardType="email-address"
          />
          
          <EcoInput
            label="Phone Number"
            value={driverProfile.phone}
            onChangeText={(text) => setDriverProfile(prev => ({ ...prev, phone: text }))}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
          />
        </EcoCard>
      )}

      {/* Vehicle Information */}
      <EcoCard style={styles.vehicleCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          <TouchableOpacity
            style={styles.editIconButton}
            onPress={() => setShowVehicleModal(true)}
          >
            <Icon name="edit" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.vehicleDetails}>
          <View style={styles.vehicleRow}>
            <Icon name="directions-car" size={24} color={Colors.primary} />
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleText}>
                {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
              </Text>
              <Text style={styles.vehicleSubtext}>
                {vehicleInfo.color} • {vehicleInfo.licensePlate}
              </Text>
            </View>
            {vehicleInfo.isEcoFriendly && (
              <View style={styles.ecoTag}>
                <Icon name="eco" size={12} color={Colors.success} />
                <Text style={styles.ecoTagText}>Eco</Text>
              </View>
            )}
          </View>
          
          <View style={styles.vehicleSpecs}>
            <Text style={styles.specText}>Type: {vehicleInfo.vehicleType}</Text>
            <Text style={styles.specText}>Fuel: {vehicleInfo.fuelType}</Text>
          </View>
        </View>
      </EcoCard>

      {/* Settings */}
      <EcoCard style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="notifications" size={24} color={Colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingSubtitle}>Receive ride alerts and updates</Text>
              </View>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={(value) => handleSettingChange('notifications', value)}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={settings.notifications ? Colors.primary : Colors.textSecondary}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="location-on" size={24} color={Colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Location Sharing</Text>
                <Text style={styles.settingSubtitle}>Share location with passengers</Text>
              </View>
            </View>
            <Switch
              value={settings.locationSharing}
              onValueChange={(value) => handleSettingChange('locationSharing', value)}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={settings.locationSharing ? Colors.primary : Colors.textSecondary}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="auto-awesome" size={24} color={Colors.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Auto Accept Rides</Text>
                <Text style={styles.settingSubtitle}>Automatically accept nearby rides</Text>
              </View>
            </View>
            <Switch
              value={settings.autoAcceptRides}
              onValueChange={(value) => handleSettingChange('autoAcceptRides', value)}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={settings.autoAcceptRides ? Colors.primary : Colors.textSecondary}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="eco" size={24} color={Colors.success} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Eco Mode</Text>
                <Text style={styles.settingSubtitle}>Prioritize eco-friendly routes</Text>
              </View>
            </View>
            <Switch
              value={settings.ecoMode}
              onValueChange={(value) => handleSettingChange('ecoMode', value)}
              trackColor={{ false: Colors.border, true: Colors.successLight }}
              thumbColor={settings.ecoMode ? Colors.success : Colors.textSecondary}
            />
          </View>
        </View>
      </EcoCard>

      {/* Quick Actions */}
      <EcoCard style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
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
        
        <TouchableOpacity style={styles.actionItem}>
          <Icon name="help" size={24} color={Colors.primary} />
          <Text style={styles.actionText}>Help & Support</Text>
          <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionItem}
          onPress={switchToRider}
        >
          <Icon name="swap-horiz" size={24} color={Colors.warning} />
          <Text style={styles.actionText}>Switch to Rider Mode</Text>
          <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionItem, styles.logoutAction]}
          onPress={handleLogout}
        >
          <Icon name="logout" size={24} color={Colors.error} />
          <Text style={[styles.actionText, styles.logoutText]}>Logout</Text>
          <Icon name="chevron-right" size={20} color={Colors.error} />
        </TouchableOpacity>
      </EcoCard>

      {/* Vehicle Edit Modal */}
      <Modal
        visible={showVehicleModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
              <Icon name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Vehicle Information</Text>
            <TouchableOpacity onPress={saveVehicleInfo}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <EcoInput
              label="Make"
              value={vehicleInfo.make}
              onChangeText={(text) => setVehicleInfo(prev => ({ ...prev, make: text }))}
              placeholder="e.g., Toyota"
            />
            
            <EcoInput
              label="Model"
              value={vehicleInfo.model}
              onChangeText={(text) => setVehicleInfo(prev => ({ ...prev, model: text }))}
              placeholder="e.g., Prius"
            />
            
            <EcoInput
              label="Year"
              value={vehicleInfo.year}
              onChangeText={(text) => setVehicleInfo(prev => ({ ...prev, year: text }))}
              placeholder="e.g., 2022"
              keyboardType="numeric"
            />
            
            <EcoInput
              label="License Plate"
              value={vehicleInfo.licensePlate}
              onChangeText={(text) => setVehicleInfo(prev => ({ ...prev, licensePlate: text }))}
              placeholder="e.g., ABC123"
            />
            
            <EcoInput
              label="Color"
              value={vehicleInfo.color}
              onChangeText={(text) => setVehicleInfo(prev => ({ ...prev, color: text }))}
              placeholder="e.g., White"
            />
            
            <View style={styles.ecoFriendlyToggle}>
              <Text style={styles.toggleLabel}>Eco-Friendly Vehicle</Text>
              <Switch
                value={vehicleInfo.isEcoFriendly}
                onValueChange={(value) => setVehicleInfo(prev => ({ ...prev, isEcoFriendly: value }))}
                trackColor={{ false: Colors.border, true: Colors.successLight }}
                thumbColor={vehicleInfo.isEcoFriendly ? Colors.success : Colors.textSecondary}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerCard: {
    margin: Spacing.medium,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.large,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.medium,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  driverName: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xsmall,
  },
  driverEmail: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.small,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  ratingText: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginLeft: Spacing.xsmall,
  },
  ratingSubtext: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginLeft: Spacing.small,
  },
  joinDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  editButton: {
    marginTop: Spacing.medium,
  },
  formCard: {
    margin: Spacing.medium,
  },
  vehicleCard: {
    margin: Spacing.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  editIconButton: {
    padding: Spacing.small,
  },
  vehicleDetails: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.medium,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  vehicleInfo: {
    flex: 1,
    marginLeft: Spacing.medium,
  },
  vehicleText: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  vehicleSubtext: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  vehicleSpecs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.small,
  },
  specText: {
    ...Typography.caption,
    color: Colors.textSecondary,
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
  settingsCard: {
    margin: Spacing.medium,
  },
  settingsList: {
    marginTop: Spacing.medium,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: Spacing.medium,
    flex: 1,
  },
  settingTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  settingSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  actionsCard: {
    margin: Spacing.medium,
    marginBottom: Spacing.xlarge,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: Spacing.medium,
  },
  logoutAction: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: Colors.error,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.medium,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  saveText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: Spacing.medium,
  },
  ecoFriendlyToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.medium,
    marginTop: Spacing.medium,
  },
  toggleLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});

export default ProfileScreen;

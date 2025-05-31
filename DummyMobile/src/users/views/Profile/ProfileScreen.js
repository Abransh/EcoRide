/**
 * Component: ProfileScreen (Rider)
 * Purpose: User profile management with personal info, ride history, and settings
 * Props: 
 *   - navigation: React Navigation object
 *   - route: Route params including onPersonaChange
 * Dependencies: SimulatedApi, SharedComponents
 * Data Flow: Displays user info, ride history, payment methods, and allows profile editing
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
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { EcoButton, EcoCard, EcoInput, LoadingSpinner } from '../../../shared/components';
import { Colors, Typography, Spacing, BorderRadius } from '../../../shared/theme';
import { getUserProfile, updateUserProfile, getUserStats } from '../../../shared/api/simulatedApi';

const ProfileScreen = ({ navigation, route }) => {
  const { onPersonaChange } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [editedData, setEditedData] = useState({});

  useEffect(() => {
    loadProfileData();
  }, []);

  /**
   * Load user profile and statistics
   */
  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const user = JSON.parse(storedUserData);
        setUserData(user);
        setEditedData(user);
        
        // Get user statistics
        const statsResult = await getUserStats(user.id, 'rider');
        if (statsResult.success) {
          setUserStats(statsResult.stats);
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle profile update
   */
  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      
      const result = await updateUserProfile(userData.id, editedData);
      
      if (result.success) {
        setUserData(result.user);
        await AsyncStorage.setItem('userData', JSON.stringify(result.user));
        setEditMode(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
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

  /**
   * Handle persona switch
   */
  const handlePersonaSwitch = () => {
    Alert.alert(
      'Switch to Driver',
      'Would you like to switch to driver mode?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            try {
              await AsyncStorage.setItem('userPersona', 'driver');
              if (onPersonaChange) {
                onPersonaChange('driver');
              }
            } catch (error) {
              console.error('Persona switch error:', error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading profile..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            onPress={() => setEditMode(!editMode)}
            style={styles.editButton}
          >
            <Icon 
              name={editMode ? 'close' : 'edit'} 
              size={24} 
              color={Colors.primary} 
            />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <EcoCard style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri: userData?.profileImage || 'https://via.placeholder.com/80/4CAF50/FFFFFF?text=R'
                }}
                style={styles.avatar}
              />
              <View style={styles.ratingContainer}>
                <Icon name="star" size={16} color={Colors.warning} />
                <Text style={styles.rating}>{userData?.rating || '5.0'}</Text>
              </View>
            </View>
            
            <View style={styles.profileInfo}>
              {editMode ? (
                <>
                  <EcoInput
                    value={editedData.name}
                    onChangeText={(text) => setEditedData(prev => ({ ...prev, name: text }))}
                    placeholder="Full Name"
                    style={styles.editInput}
                  />
                  <EcoInput
                    value={editedData.email}
                    onChangeText={(text) => setEditedData(prev => ({ ...prev, email: text }))}
                    placeholder="Email"
                    keyboardType="email-address"
                    style={styles.editInput}
                  />
                  <EcoInput
                    value={editedData.phone}
                    onChangeText={(text) => setEditedData(prev => ({ ...prev, phone: text }))}
                    placeholder="Phone"
                    keyboardType="phone-pad"
                    style={styles.editInput}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.userName}>{userData?.name}</Text>
                  <Text style={styles.userEmail}>{userData?.email}</Text>
                  <Text style={styles.userPhone}>{userData?.phone}</Text>
                </>
              )}
            </View>
          </View>

          {editMode && (
            <View style={styles.editActions}>
              <EcoButton
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setEditMode(false);
                  setEditedData(userData);
                }}
                style={styles.editButton}
              />
              <EcoButton
                title="Save"
                onPress={handleUpdateProfile}
                style={styles.editButton}
              />
            </View>
          )}
        </EcoCard>

        {/* Stats */}
        {userStats && (
          <EcoCard style={styles.statsCard}>
            <Text style={styles.cardTitle}>Your EcoRide Journey</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userStats.totalRides}</Text>
                <Text style={styles.statLabel}>Total Rides</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userStats.carbonSaved}kg</Text>
                <Text style={styles.statLabel}>CO₂ Saved</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userStats.moneySaved}</Text>
                <Text style={styles.statLabel}>Money Saved</Text>
              </View>
            </View>
            <View style={styles.ecoImpact}>
              <Icon name="eco" size={20} color={Colors.success} />
              <Text style={styles.ecoImpactText}>
                Equivalent to {userStats.treesEquivalent} trees planted!
              </Text>
            </View>
          </EcoCard>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionItem}>
            <Icon name="history" size={24} color={Colors.textSecondary} />
            <Text style={styles.actionText}>Ride History</Text>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <Icon name="payment" size={24} color={Colors.textSecondary} />
            <Text style={styles.actionText}>Payment Methods</Text>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <Icon name="notifications" size={24} color={Colors.textSecondary} />
            <Text style={styles.actionText}>Notifications</Text>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <Icon name="help" size={24} color={Colors.textSecondary} />
            <Text style={styles.actionText}>Help & Support</Text>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <Icon name="settings" size={24} color={Colors.textSecondary} />
            <Text style={styles.actionText}>Settings</Text>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* App Actions */}
        <EcoCard style={styles.appActionsCard}>
          <EcoButton
            title="Switch to Driver Mode"
            variant="outline"
            onPress={handlePersonaSwitch}
            style={styles.appActionButton}
            icon="swap-horiz"
          />
          
          <EcoButton
            title="Logout"
            variant="outline"
            onPress={handleLogout}
            style={[styles.appActionButton, styles.logoutButton]}
            icon="logout"
          />
        </EcoCard>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>EcoRide v1.0.0</Text>
          <Text style={styles.appInfoText}>Making transportation sustainable</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
  headerTitle: {
    ...Typography.heading1,
    color: Colors.textPrimary,
  },
  editButton: {
    padding: Spacing.small,
  },
  profileCard: {
    marginHorizontal: Spacing.large,
    marginBottom: Spacing.large,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.medium,
  },
  avatarContainer: {
    marginRight: Spacing.large,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.small,
  },
  rating: {
    ...Typography.caption,
    color: Colors.textPrimary,
    marginLeft: Spacing.xsmall,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    ...Typography.heading2,
    color: Colors.textPrimary,
    marginBottom: Spacing.xsmall,
  },
  userEmail: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xsmall,
  },
  userPhone: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  editInput: {
    marginBottom: Spacing.small,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.medium,
  },
  statsCard: {
    marginHorizontal: Spacing.large,
    marginBottom: Spacing.large,
  },
  cardTitle: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    marginBottom: Spacing.medium,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.medium,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.heading2,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xsmall,
    textAlign: 'center',
  },
  ecoImpact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.medium,
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.medium,
  },
  ecoImpactText: {
    ...Typography.body,
    color: Colors.success,
    marginLeft: Spacing.small,
    fontWeight: 'bold',
  },
  actionsContainer: {
    marginHorizontal: Spacing.large,
    marginBottom: Spacing.large,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.medium,
    paddingHorizontal: Spacing.large,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.small,
    borderRadius: BorderRadius.medium,
  },
  actionText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: Spacing.medium,
  },
  appActionsCard: {
    marginHorizontal: Spacing.large,
    marginBottom: Spacing.large,
  },
  appActionButton: {
    marginBottom: Spacing.medium,
  },
  logoutButton: {
    borderColor: Colors.error,
  },
  appInfo: {
    alignItems: 'center',
    paddingBottom: Spacing.large,
  },
  appInfoText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xsmall,
  },
});

export default ProfileScreen;

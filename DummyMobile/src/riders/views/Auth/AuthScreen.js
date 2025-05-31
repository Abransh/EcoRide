/**
 * Component: AuthScreen (Driver)
 * Purpose: Authentication screen for drivers - handles login/signup with vehicle info
 * Props: 
 *   - navigation: React Navigation object
 *   - route: Route params including onPersonaChange
 * Dependencies: SimulatedApi, SharedComponents, Theme
 * Data Flow: Authenticates driver and navigates to main app or allows persona switch
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EcoButton, EcoInput, EcoCard, LoadingSpinner } from '../../../shared/components';
import { Colors, Typography, Spacing, BorderRadius } from '../../../shared/theme';
import { authenticateUser, registerUser } from '../../../shared/api/simulatedApi';

const AuthScreen = ({ navigation, route }) => {
  const { onPersonaChange } = route.params || {};
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    licensePlate: '',
    vehicleColor: '',
  });

  /**
   * Check if user is already authenticated on component mount
   */
  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const persona = await AsyncStorage.getItem('userPersona');
      
      if (token && persona === 'driver') {
        // User is already authenticated as driver, navigate to main app
        navigation.replace('DriverTabs');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    }
  };

  /**
   * Handle form input changes
   */
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Handle form submission for login/signup
   */
  const handleSubmit = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isLogin && (!formData.name || !formData.phone || !formData.vehicleMake || !formData.vehicleModel || !formData.licensePlate)) {
      Alert.alert('Error', 'Please fill in all required fields including vehicle information');
      return;
    }

    setLoading(true);

    try {
      let result;
      
      if (isLogin) {
        result = await authenticateUser(formData.email, formData.password, 'driver');
      } else {
        result = await registerUser({
          ...formData,
          persona: 'driver',
          vehicle: {
            make: formData.vehicleMake,
            model: formData.vehicleModel,
            year: formData.vehicleYear,
            licensePlate: formData.licensePlate,
            color: formData.vehicleColor,
          },
        });
      }

      if (result.success) {
        // Save auth token and user data
        await AsyncStorage.setItem('authToken', result.token);
        await AsyncStorage.setItem('userData', JSON.stringify(result.user));
        
        // Navigate to main app
        navigation.replace('DriverTabs');
      } else {
        Alert.alert('Error', result.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle persona switch (back to selector)
   */
  const handlePersonaSwitch = () => {
    if (onPersonaChange) {
      onPersonaChange(null); // This will show persona selector again
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message={isLogin ? "Signing in..." : "Creating driver account..."} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isLogin ? 'Welcome Back, Driver!' : 'Become an EcoRide Driver'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin 
                ? 'Sign in to start earning with eco-friendly rides' 
                : 'Join our community of eco-conscious drivers'
              }
            </Text>
          </View>

          {/* Form */}
          <EcoCard style={styles.formCard}>
            {!isLogin && (
              <>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <EcoInput
                  label="Full Name"
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  placeholder="Enter your full name"
                  style={styles.input}
                />
                <EcoInput
                  label="Phone Number"
                  value={formData.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  placeholder="+1 (555) 123-4567"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </>
            )}
            
            <EcoInput
              label="Email"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            
            <EcoInput
              label="Password"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              placeholder="Enter your password"
              secureTextEntry
              style={styles.input}
            />

            {!isLogin && (
              <>
                <Text style={styles.sectionTitle}>Vehicle Information</Text>
                <View style={styles.vehicleRow}>
                  <EcoInput
                    label="Make"
                    value={formData.vehicleMake}
                    onChangeText={(value) => handleInputChange('vehicleMake', value)}
                    placeholder="Toyota"
                    style={[styles.input, styles.halfWidth]}
                  />
                  <EcoInput
                    label="Model"
                    value={formData.vehicleModel}
                    onChangeText={(value) => handleInputChange('vehicleModel', value)}
                    placeholder="Prius"
                    style={[styles.input, styles.halfWidth]}
                  />
                </View>
                <View style={styles.vehicleRow}>
                  <EcoInput
                    label="Year"
                    value={formData.vehicleYear}
                    onChangeText={(value) => handleInputChange('vehicleYear', value)}
                    placeholder="2022"
                    keyboardType="numeric"
                    style={[styles.input, styles.halfWidth]}
                  />
                  <EcoInput
                    label="Color"
                    value={formData.vehicleColor}
                    onChangeText={(value) => handleInputChange('vehicleColor', value)}
                    placeholder="Blue"
                    style={[styles.input, styles.halfWidth]}
                  />
                </View>
                <EcoInput
                  label="License Plate"
                  value={formData.licensePlate}
                  onChangeText={(value) => handleInputChange('licensePlate', value)}
                  placeholder="ECO-123"
                  autoCapitalize="characters"
                  style={styles.input}
                />
              </>
            )}

            <EcoButton
              title={isLogin ? 'Sign In' : 'Create Driver Account'}
              onPress={handleSubmit}
              style={styles.submitButton}
              loading={loading}
            />
          </EcoCard>

          {/* Toggle Login/Signup */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <EcoButton
              title={isLogin ? 'Sign Up' : 'Sign In'}
              variant="text"
              onPress={() => setIsLogin(!isLogin)}
            />
          </View>

          {/* Persona Switch */}
          <View style={styles.personaSwitchContainer}>
            <Text style={styles.personaSwitchText}>Looking for a ride instead?</Text>
            <EcoButton
              title="Switch to Rider"
              variant="outline"
              onPress={handlePersonaSwitch}
              style={styles.personaSwitchButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.large,
  },
  header: {
    marginBottom: Spacing.xlarge,
    alignItems: 'center',
  },
  title: {
    ...Typography.heading1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.small,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: Spacing.large,
  },
  sectionTitle: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    marginBottom: Spacing.medium,
    marginTop: Spacing.medium,
  },
  input: {
    marginBottom: Spacing.medium,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  submitButton: {
    marginTop: Spacing.medium,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.large,
  },
  toggleText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  personaSwitchContainer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: Spacing.large,
  },
  personaSwitchText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.small,
  },
  personaSwitchButton: {
    width: '100%',
  },
});

export default AuthScreen;

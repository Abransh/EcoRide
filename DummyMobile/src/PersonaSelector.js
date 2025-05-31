/**
 * Component: PersonaSelector
 * Purpose: First screen where users choose between Rider or Driver persona
 * Props: 
 *   - onPersonaSelect: Function called when persona is selected
 * Dependencies: SharedComponents, Theme, AsyncStorage
 * Data Flow: Saves selected persona to AsyncStorage and navigates to respective app module
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EcoButton, EcoCard, LoadingSpinner } from './shared/components';
import { Colors, Typography, Spacing, BorderRadius } from './shared/theme';

const { width, height } = Dimensions.get('window');

const PersonaSelector = ({ onPersonaSelect }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(null);

  /**
   * Handle persona selection
   * Saves the selected persona to AsyncStorage and calls parent callback
   */
  const handlePersonaSelect = async (persona) => {
    try {
      setLoading(true);
      setSelectedPersona(persona);
      
      // Save persona choice to AsyncStorage
      await AsyncStorage.setItem('userPersona', persona);
      
      // Simulate some processing time
      setTimeout(() => {
        setLoading(false);
        onPersonaSelect(persona);
      }, 1500);
    } catch (error) {
      console.error('Error saving persona:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingSpinner 
          size="large" 
          text={`Setting up your ${selectedPersona} experience...`}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to EcoRide</Text>
          <Text style={styles.subtitle}>
            Choose how you'd like to contribute to a greener future
          </Text>
        </View>

        {/* Eco Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            🌱 Over 10,000 kg CO₂ saved this month
          </Text>
          <Text style={styles.statsText}>
            🚗 5,000+ eco-friendly rides completed
          </Text>
        </View>

        {/* Persona Cards */}
        <View style={styles.cardsContainer}>
          {/* Rider Card */}
          <EcoCard 
            style={styles.personaCard}
            onPress={() => handlePersonaSelect('rider')}
            shadow="medium"
          >
            <View style={styles.cardContent}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🏠</Text>
              </View>
              <Text style={styles.cardTitle}>I need a ride</Text>
              <Text style={styles.cardDescription}>
                Book eco-friendly rides and reduce your carbon footprint
              </Text>
              <View style={styles.benefitsList}>
                <Text style={styles.benefit}>• Affordable eco rides</Text>
                <Text style={styles.benefit}>• Track carbon savings</Text>
                <Text style={styles.benefit}>• Premium hybrid vehicles</Text>
              </View>
            </View>
          </EcoCard>

          {/* Driver Card */}
          <EcoCard 
            style={styles.personaCard}
            onPress={() => handlePersonaSelect('driver')}
            shadow="medium"
          >
            <View style={styles.cardContent}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>🚗</Text>
              </View>
              <Text style={styles.cardTitle}>I want to drive</Text>
              <Text style={styles.cardDescription}>
                Earn money while helping the environment with your eco vehicle
              </Text>
              <View style={styles.benefitsList}>
                <Text style={styles.benefit}>• Flexible earnings</Text>
                <Text style={styles.benefit}>• Eco vehicle incentives</Text>
                <Text style={styles.benefit}>• Make a difference</Text>
              </View>
            </View>
          </EcoCard>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Join the green transportation revolution 🌍
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  statsContainer: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  statsText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
    fontWeight: Typography.fontWeight.medium,
    marginVertical: 2,
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  personaCard: {
    minHeight: height * 0.25,
    justifyContent: 'center',
  },
  cardContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  icon: {
    fontSize: 40,
  },
  cardTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  benefitsList: {
    alignItems: 'flex-start',
  },
  benefit: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.medium,
    marginVertical: 2,
  },
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PersonaSelector;

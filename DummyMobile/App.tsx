/**
 * EcoRide App - Eco-friendly Ride Hailing Application
 * Main entry point that handles persona selection and routing
 * 
 * @format
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import main components
import PersonaSelector from './src/PersonaSelector';
import MainNavigator from './src/navigation/MainNavigator';
import { LoadingSpinner } from './src/shared/components';
import { Colors } from './src/shared/theme';

export default function App() {
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load saved persona on app startup
   * Check if user has previously selected a persona and is authenticated
   */
  useEffect(() => {
    loadSavedPersona();
  }, []);

  const loadSavedPersona = async () => {
    try {
      const savedPersona = await AsyncStorage.getItem('userPersona');
      const authToken = await AsyncStorage.getItem('authToken');
      
      // Only auto-select persona if user is authenticated
      if (savedPersona && authToken) {
        setSelectedPersona(savedPersona);
      }
    } catch (error) {
      console.error('Error loading saved persona:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle persona selection from PersonaSelector
   * @param {string|null} persona - Selected persona ('rider' | 'driver' | null)
   */
  const handlePersonaSelect = async (persona: string | null) => {
    setSelectedPersona(persona);
    
    if (persona) {
      try {
        await AsyncStorage.setItem('userPersona', persona);
      } catch (error) {
        console.error('Error saving persona:', error);
      }
    } else {
      // Clear persona when user wants to switch
      try {
        await AsyncStorage.removeItem('userPersona');
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userData');
      } catch (error) {
        console.error('Error clearing persona data:', error);
      }
    }
  };

  // Show loading screen while checking saved data
  if (isLoading) {
    return <LoadingSpinner message="Loading EcoRide..." />;
  }

  return (
    <>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={Colors.background} 
      />
      <NavigationContainer>
        {selectedPersona ? (
          <MainNavigator 
            persona={selectedPersona} 
            onPersonaChange={handlePersonaSelect}
          />
        ) : (
          <PersonaSelector onPersonaSelect={handlePersonaSelect} />
        )}
      </NavigationContainer>
    </>
  );
}

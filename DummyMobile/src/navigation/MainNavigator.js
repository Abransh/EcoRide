/**
 * Component: MainNavigator
 * Purpose: Main navigation controller that switches between Rider and Driver apps
 * Props: 
 *   - persona: Selected persona ('rider' | 'driver')
 *   - onPersonaChange: Function to change persona
 * Dependencies: React Navigation, AsyncStorage
 * Data Flow: Routes to appropriate app module based on persona
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RiderNavigator from '../users/RiderNavigator';
import DriverNavigator from '../riders/DriverNavigator';

const Stack = createNativeStackNavigator();

const MainNavigator = ({ persona, onPersonaChange }) => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'fade',
      }}
    >
      {persona === 'rider' ? (
        <Stack.Screen 
          name="RiderApp" 
          component={RiderNavigator}
          initialParams={{ onPersonaChange }}
        />
      ) : (
        <Stack.Screen 
          name="DriverApp" 
          component={DriverNavigator}
          initialParams={{ onPersonaChange }}
        />
      )}
    </Stack.Navigator>
  );
};

export default MainNavigator;

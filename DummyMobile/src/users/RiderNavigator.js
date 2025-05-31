/**
 * Component: RiderNavigator
 * Purpose: Navigation stack for Rider persona with all rider-specific screens
 * Props: 
 *   - route: Navigation route with params including onPersonaChange
 * Dependencies: React Navigation, All Rider Views
 * Data Flow: Manages navigation between rider screens (Auth, Home, Booking, Profile)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import rider views
import AuthScreen from './views/Auth/AuthScreen';
import HomeScreen from './views/Home/HomeScreen';
import BookingScreen from './views/Booking/BookingScreen';
import ProfileScreen from './views/Profile/ProfileScreen';

// Import theme
import { Colors } from '../shared/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Bottom tab navigator for authenticated riders
 */
const RiderTabNavigator = ({ route }) => {
  const { onPersonaChange } = route.params || {};

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Booking':
              iconName = 'directions-car';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          paddingBottom: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        initialParams={{ onPersonaChange }}
      />
      <Tab.Screen 
        name="Booking" 
        component={BookingScreen}
        initialParams={{ onPersonaChange }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        initialParams={{ onPersonaChange }}
      />
    </Tab.Navigator>
  );
};

/**
 * Main stack navigator for riders
 * Handles authentication flow and main app navigation
 */
const RiderNavigator = ({ route }) => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="Auth" 
        component={AuthScreen}
        initialParams={route.params}
      />
      <Stack.Screen 
        name="RiderTabs" 
        component={RiderTabNavigator}
        initialParams={route.params}
      />
    </Stack.Navigator>
  );
};

export default RiderNavigator;

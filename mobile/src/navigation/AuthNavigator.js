import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Auth Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// Common transition configurations
const screenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: 'white' },
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 300,
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 300,
      },
    },
  },
  cardStyleInterpolator: ({ current, layouts }) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
      },
    };
  },
};

const Stack = createStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={screenOptions}
    >
      {/* Welcome Screen - First screen users see */}
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          animationTypeForReplace: 'push',
        }}
      />

      {/* Login Screen - Phone number entry */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: 'Login',
        }}
      />

      {/* OTP Verification Screen */}
      <Stack.Screen
        name="OTPVerification"
        component={OTPScreen}
        options={{
          title: 'Verify OTP',
          gestureEnabled: false, // Prevent back gesture during OTP verification
        }}
      />

      {/* Signup Screen - For new users */}
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{
          title: 'Create Account',
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
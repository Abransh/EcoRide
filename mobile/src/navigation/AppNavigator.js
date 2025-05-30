import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Navigation components
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
//import OnboardingNavigator from './OnboardingNavigator';

// Screens
import SplashScreen from '../screens/SplashScreen';
//Screen from '../components/common/LoadingScreen';

// Redux
import { 
  initializeAuth, 
  selectIsAuthenticated, 
  selectAuth 
} from '../store/slices/authSlice';

// Services
import { getCurrentUser } from '../store/slices/authSlice';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, isInitialized, user } = useSelector(selectAuth);

  useEffect(() => {
    initializeApplication();
  }, []);

  const initializeApplication = async () => {
    try {
      console.log('🚀 Initializing Eco Ride Application...');
      
      // Get stored authentication data
      const storedToken = await AsyncStorage.getItem('accessToken');
      const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
      
      if (storedToken && storedRefreshToken) {
        console.log('🔐 Found stored tokens, validating...');
        
        // Initialize auth state with stored tokens
        dispatch(initializeAuth({
          token: storedToken,
          refreshToken: storedRefreshToken,
          user: null
        }));
        
        // Try to get current user to validate token
        try {
          await dispatch(getCurrentUser()).unwrap();
          console.log('✅ User authenticated successfully');
        } catch (error) {
          console.log('❌ Token validation failed:', error);
          // Clear invalid tokens
          await AsyncStorage.removeItem('accessToken');
          await AsyncStorage.removeItem('refreshToken');
          dispatch(initializeAuth({ token: null, refreshToken: null, user: null }));
        }
      } else {
        console.log('📱 No stored tokens found');
        dispatch(initializeAuth({ token: null, refreshToken: null, user: null }));
      }
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      dispatch(initializeAuth({ token: null, refreshToken: null, user: null }));
    }
  };

  // Show splash screen while initializing
  if (!isInitialized) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'white' },
        animationEnabled: true,
      }}
    >
      {isAuthenticated ? (
        // User is authenticated - show main app
        user?.isNewUser ? (
          // New user - show onboarding
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingNavigator}
            options={{
              animationTypeForReplace: 'push',
            }}
          />
        ) : (
          // Existing user - show main app
          <Stack.Screen 
            name="Main" 
            component={MainTabNavigator}
            options={{
              animationTypeForReplace: 'push',
            }}
          />
        )
      ) : (
        // User not authenticated - show auth screens
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigator}
          options={{
            animationTypeForReplace: 'pop',
          }}
        />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
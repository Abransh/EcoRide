

import React, { useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Redux Store
import { store, persistor } from './src/store';

// Navigation
import AppNavigator from './src/navigation/AppNavigator';

// Components
import LoadingScreen from './src/components/common/LoadingScreen';

// Services
import { initializeSocket } from './src/services/socket/socketService';
import { requestLocationPermission } from './src/utils/permissions';

// Constants
import { COLORS } from './src/constants/colors';

const App = () => {
  useEffect(() => {
    // Initialize app on mount
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Request necessary permissions
      await requestPermissions();
      
      // Initialize socket connection
      initializeSocket();
      
      console.log('🚀 Eco Ride App initialized successfully');
    } catch (error) {
      console.error('❌ App initialization failed:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        // Request location permission
        const locationGranted = await requestLocationPermission();
        
        if (!locationGranted) {
          Alert.alert(
            'Location Permission Required',
            'Eco Ride needs location access to find nearby drivers and provide ride services.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Open Settings',
                onPress: () => {
                  // Open app settings
                  // Linking.openSettings();
                },
              },
            ]
          );
        }

        // Request other permissions
        const permissions = [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ];

        await PermissionsAndroid.requestMultiple(permissions);
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <GestureHandlerRootView style={styles.container}>
          <SafeAreaProvider>
            <StatusBar
              barStyle="dark-content"
              backgroundColor={COLORS.WHITE}
              translucent={false}
            />
            <NavigationContainer
              theme={{
                dark: false,
                colors: {
                  primary: COLORS.PRIMARY,
                  background: COLORS.WHITE,
                  card: COLORS.WHITE,
                  text: COLORS.TEXT_PRIMARY,
                  border: COLORS.BORDER,
                  notification: COLORS.SUCCESS,
                },
              }}
            >
              <AppNavigator />
            </NavigationContainer>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
});

export default App;
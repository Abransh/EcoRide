/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import BaseView from './src/components/BaseView';

// Removed all imported components

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialRoute = async () => {
      try {
        const [_authToken, _nameSet, _genderSet, _freeChatDone, _chatWindowDone, _coachChatHisDone,_waitingUsersWin] = await Promise.all([
          AsyncStorage.getItem('authToken'),
          AsyncStorage.getItem('userName'),
          AsyncStorage.getItem('userGender'),
          AsyncStorage.getItem('freeChatDone'),
          AsyncStorage.getItem('chatWindowDone'),
          AsyncStorage.getItem('coachChatHisDone'),
          AsyncStorage.getItem('waitingUsersWin')
        ]);

        // Set initial route to baseView
        setInitialRoute('baseView');
        
        // Optional: You can still store this in AsyncStorage if needed
        await AsyncStorage.setItem('initialRoute', 'baseView');
        console.log('Initial route set to baseView');
      } catch (error) {
        console.error('Failed to load initial route:', error);
        setInitialRoute('FreeChatPage'); // Fallback in case of error is also FreeChatPage
      }
    };

    loadInitialRoute();
  }, []);

  if (!initialRoute) {
    // Render a loading screen or null while the initial route is being determined
    return null;
  }

  return (
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute}>
          <Stack.Screen name="baseView" component={BaseView} />
        </Stack.Navigator>
      </NavigationContainer>
  );
}

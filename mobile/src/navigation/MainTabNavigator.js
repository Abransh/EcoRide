import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Screens
import HomeScreen from '../screens/home/HomeScreen';
import RideHistoryScreen from '../screens/ride/RideHistoryScreen';
import SubscriptionScreen from '../screens/subscription/SubscriptionScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Stack screens
import RideBookingScreen from '../screens/ride/RideBookingScreen';
import RideTrackingScreen from '../screens/ride/RideTrackingScreen';
import RideCompleteScreen from '../screens/ride/RideCompleteScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import PaymentMethodsScreen from '../screens/profile/PaymentMethodsScreen';
import AddressesScreen from '../screens/profile/AddressesScreen';
import SupportScreen from '../screens/support/SupportScreen';
import PlanSelectionScreen from '../screens/subscription/PlanSelectionScreen';

// Constants
import { COLORS } from '../constants/colors';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack Navigator
const HomeStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: 'white' },
    }}
  >
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen 
      name="RideBooking" 
      component={RideBookingScreen}
      options={{
        headerShown: true,
        title: 'Book Ride',
        headerStyle: {
          backgroundColor: COLORS.PRIMARY,
        },
        headerTintColor: COLORS.WHITE,
      }}
    />
    <Stack.Screen 
      name="RideTracking" 
      component={RideTrackingScreen}
      options={{
        headerShown: false,
        gestureEnabled: false, // Prevent going back during ride
      }}
    />
    <Stack.Screen 
      name="RideComplete" 
      component={RideCompleteScreen}
      options={{
        headerShown: false,
        gestureEnabled: false,
      }}
    />
  </Stack.Navigator>
);

// History Stack Navigator
const HistoryStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: true,
      headerStyle: {
        backgroundColor: COLORS.PRIMARY,
      },
      headerTintColor: COLORS.WHITE,
    }}
  >
    <Stack.Screen 
      name="HistoryMain" 
      component={RideHistoryScreen}
      options={{ title: 'Ride History' }}
    />
  </Stack.Navigator>
);

// Subscription Stack Navigator
const SubscriptionStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: true,
      headerStyle: {
        backgroundColor: COLORS.PRIMARY,
      },
      headerTintColor: COLORS.WHITE,
    }}
  >
    <Stack.Screen 
      name="SubscriptionMain" 
      component={SubscriptionScreen}
      options={{ title: 'Subscription' }}
    />
    <Stack.Screen 
      name="PlanSelection" 
      component={PlanSelectionScreen}
      options={{ title: 'Choose Plan' }}
    />
  </Stack.Navigator>
);

// Profile Stack Navigator
const ProfileStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: true,
      headerStyle: {
        backgroundColor: COLORS.PRIMARY,
      },
      headerTintColor: COLORS.WHITE,
    }}
  >
    <Stack.Screen 
      name="ProfileMain" 
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
    <Stack.Screen 
      name="EditProfile" 
      component={EditProfileScreen}
      options={{ title: 'Edit Profile' }}
    />
    <Stack.Screen 
      name="PaymentMethods" 
      component={PaymentMethodsScreen}
      options={{ title: 'Payment Methods' }}
    />
    <Stack.Screen 
      name="Addresses" 
      component={AddressesScreen}
      options={{ title: 'Saved Addresses' }}
    />
    <Stack.Screen 
      name="Support" 
      component={SupportScreen}
      options={{ title: 'Help & Support' }}
    />
  </Stack.Navigator>
);

// Tab bar icon component
const TabIcon = ({ name, color, size }) => (
  <Icon name={name} size={size} color={color} />
);

// Main Tab Navigator
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'History':
              iconName = 'history';
              break;
            case 'Subscription':
              iconName = 'card-membership';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <TabIcon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.TEXT_SECONDARY,
        tabBarStyle: {
          backgroundColor: COLORS.WHITE,
          borderTopColor: COLORS.BORDER,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          title: 'Home',
          tabBarBadge: null, // Can show notification count
        }}
      />
      
      <Tab.Screen
        name="History"
        component={HistoryStackNavigator}
        options={{
          title: 'History',
        }}
      />
      
      <Tab.Screen
        name="Subscription"
        component={SubscriptionStackNavigator}
        options={{
          title: 'Plans',
        }}
      />
      
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
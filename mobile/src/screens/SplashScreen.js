import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Constants
import { COLORS } from '../constants/colors';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const loadingRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startAnimations();
  }, []);

  const startAnimations = () => {
    // Logo animation sequence
    Animated.sequence([
      // Logo scale and fade in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      
      // Text fade in
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      
      // Loading indicator fade in
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 400,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous loading rotation
    Animated.loop(
      Animated.timing(loadingRotation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const rotateInterpolate = loadingRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.PRIMARY}
        translucent={false}
      />
      
      <LinearGradient
        colors={COLORS.GRADIENT_ECO}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                transform: [{ scale: logoScale }],
                opacity: logoOpacity,
              },
            ]}
          >
            <View style={styles.logoBackground}>
              <Icon
                name="eco"
                size={80}
                color={COLORS.WHITE}
              />
            </View>
          </Animated.View>

          {/* App Name */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: textOpacity,
              },
            ]}
          >
            <Text style={styles.appName}>Eco Ride</Text>
            <Text style={styles.tagline}>Green Transport, Brighter Future</Text>
          </Animated.View>
        </View>

        {/* Loading Section */}
        <Animated.View
          style={[
            styles.loadingContainer,
            {
              opacity: loadingOpacity,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.loadingIcon,
              {
                transform: [{ rotate: rotateInterpolate }],
              },
            ]}
          >
            <Icon
              name="refresh"
              size={24}
              color={COLORS.WHITE}
            />
          </Animated.View>
          <Text style={styles.loadingText}>Starting your eco journey...</Text>
        </Animated.View>

        {/* Eco Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Icon name="nature" size={20} color={COLORS.WHITE} />
            <Text style={styles.statText}>100% Electric</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="air" size={20} color={COLORS.WHITE} />
            <Text style={styles.statText}>Zero Emissions</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="savings" size={20} color={COLORS.WHITE} />
            <Text style={styles.statText}>Save Money</Text>
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoWrapper: {
    marginBottom: 30,
  },
  logoBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.WHITE + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.WHITE + '30',
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.WHITE + 'CC',
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 150,
    alignItems: 'center',
  },
  loadingIcon: {
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.WHITE + 'CC',
    textAlign: 'center',
    fontWeight: '400',
  },
  statsContainer: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: width * 0.8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: 12,
    color: COLORS.WHITE + 'CC',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '400',
  },
  versionContainer: {
    position: 'absolute',
    bottom: 30,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.WHITE + '80',
    textAlign: 'center',
  },
});

export default SplashScreen;
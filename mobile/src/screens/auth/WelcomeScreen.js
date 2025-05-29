import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Constants
import { COLORS } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        delay: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  const FeatureCard = ({ icon, title, description, delay = 0 }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 600,
        delay: delay,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.featureCard,
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.featureIcon}>
          <Icon name={icon} size={24} color={COLORS.PRIMARY} />
        </View>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.PRIMARY}
        translucent={false}
      />

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <LinearGradient
          colors={COLORS.GRADIENT_PRIMARY}
          style={styles.headerSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View
            style={[
              styles.headerContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.logoBackground}>
                <Icon name="eco" size={60} color={COLORS.WHITE} />
              </View>
            </View>

            {/* App Title */}
            <Text style={styles.appTitle}>Welcome to Eco Ride</Text>
            <Text style={styles.appSubtitle}>
              India's First 100% Electric Ride Sharing Platform
            </Text>

            {/* Eco Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0kg</Text>
                <Text style={styles.statLabel}>CO₂ Emissions</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>100%</Text>
                <Text style={styles.statLabel}>Electric Fleet</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>₹5+</Text>
                <Text style={styles.statLabel}>Savings per km</Text>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Why Choose Eco Ride?</Text>

          <FeatureCard
            icon="nature"
            title="Eco-Friendly Transport"
            description="100% electric vehicles for zero-emission rides. Help save the planet with every trip."
            delay={200}
          />

          <FeatureCard
            icon="savings"
            title="Affordable Pricing"
            description="Competitive rates with subscription plans. Save up to 40% on your daily commute."
            delay={400}
          />

          <FeatureCard
            icon="flash-on"
            title="Quick & Reliable"
            description="Fast booking, real-time tracking, and reliable service. Get to your destination on time."
            delay={600}
          />

          <FeatureCard
            icon="security"
            title="Safe & Secure"
            description="Verified drivers, GPS tracking, SOS button, and 24/7 customer support for your safety."
            delay={800}
          />
        </View>

        {/* Subscription Highlight */}
        <View style={styles.subscriptionSection}>
          <LinearGradient
            colors={[COLORS.ACCENT_LIGHT, COLORS.ACCENT]}
            style={styles.subscriptionCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Icon name="card-membership" size={30} color={COLORS.WHITE} />
            <Text style={styles.subscriptionTitle}>Subscription Plans</Text>
            <Text style={styles.subscriptionText}>
              Monthly plans starting from ₹500. Unlimited rides with included kilometers.
            </Text>
          </LinearGradient>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                transform: [{ scale: buttonScale }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={handleGetStarted}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={COLORS.GRADIENT_PRIMARY}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.buttonText}>Get Started</Text>
                <Icon name="arrow-forward" size={20} color={COLORS.WHITE} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  scrollContainer: {
    flex: 1,
  },
  headerSection: {
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.WHITE + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.WHITE + '30',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    textAlign: 'center',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: COLORS.WHITE + 'DD',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.WHITE + 'CC',
    textAlign: 'center',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.WHITE + '30',
  },
  featuresSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 30,
  },
  featureCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  subscriptionSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  subscriptionCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginTop: 10,
    marginBottom: 8,
  },
  subscriptionText: {
    fontSize: 14,
    color: COLORS.WHITE + 'DD',
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaSection: {
    padding: 20,
    paddingBottom: 40,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  getStartedButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginRight: 8,
  },
  termsText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default WelcomeScreen;
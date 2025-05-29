import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Redux
import { sendOTP, selectOTPState, selectAuthError, clearError } from '../../store/slices/authSlice';

// Services
import { authValidation } from '../../services/api/auth';

// Constants
import { COLORS } from '../../constants/colors';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { otpSent, otpLoading } = useSelector(selectOTPState);
  const error = useSelector(selectAuthError);

  // Form state
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    // Clear any previous errors
    dispatch(clearError());
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Handle phone input change
  const handlePhoneChange = (text) => {
    // Remove any non-numeric characters
    const cleanText = text.replace(/[^0-9]/g, '');
    
    // Limit to 10 digits
    if (cleanText.length <= 10) {
      setPhone(cleanText);
      setPhoneError('');
    }
  };

  // Validate and send OTP
  const handleSendOTP = async () => {
    try {
      // Clear previous errors
      setPhoneError('');
      dispatch(clearError());

      // Validate phone number
      const validation = authValidation.validatePhone(phone);
      if (!validation.isValid) {
        setPhoneError(validation.error);
        return;
      }

      // Dispatch send OTP action
      const result = await dispatch(sendOTP({ phone: validation.phone })).unwrap();
      
      // Navigate to OTP screen on success
      navigation.navigate('OTPVerification', { 
        phone: validation.phone,
        isExistingUser: result.isExistingUser 
      });

    } catch (error) {
      console.error('Send OTP error:', error);
      Alert.alert('Error', error || 'Failed to send OTP. Please try again.');
    }
  };

  // Handle back navigation
  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.PRIMARY} />
      
      <LinearGradient
        colors={COLORS.GRADIENT_PRIMARY}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={COLORS.WHITE} />
        </TouchableOpacity>

        {/* Header Content */}
        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.logoContainer}>
            <Icon name="eco" size={50} color={COLORS.WHITE} />
          </View>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>
            Enter your phone number to continue your eco journey
          </Text>
        </Animated.View>
      </LinearGradient>

      <View style={styles.formContainer}>
        <Animated.View
          style={[
            styles.form,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Phone Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Mobile Number</Text>
            <View style={styles.phoneInputContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                style={[
                  styles.phoneInput,
                  phoneError ? styles.inputError : {},
                ]}
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="numeric"
                maxLength={10}
                autoFocus={true}
                placeholderTextColor={COLORS.TEXT_SECONDARY}
              />
            </View>
            
            {/* Phone Error */}
            {phoneError ? (
              <Text style={styles.errorText}>{phoneError}</Text>
            ) : null}
            
            {/* General Error */}
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </View>

          {/* Send OTP Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              otpLoading || phone.length !== 10 ? styles.sendButtonDisabled : {},
            ]}
            onPress={handleSendOTP}
            disabled={otpLoading || phone.length !== 10}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                otpLoading || phone.length !== 10
                  ? [COLORS.TEXT_DISABLED, COLORS.TEXT_DISABLED]
                  : COLORS.GRADIENT_PRIMARY
              }
              style={styles.sendButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {otpLoading ? (
                <View style={styles.loadingContainer}>
                  <Icon name="refresh" size={20} color={COLORS.WHITE} />
                  <Text style={styles.sendButtonText}>Sending OTP...</Text>
                </View>
              ) : (
                <Text style={styles.sendButtonText}>Send OTP</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Info Text */}
          <Text style={styles.infoText}>
            We'll send you a 6-digit verification code via SMS
          </Text>

          {/* Terms */}
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.WHITE + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.WHITE + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.WHITE + 'DD',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  inputSection: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    backgroundColor: COLORS.WHITE,
    elevation: 1,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  countryCode: {
    paddingHorizontal: 15,
    paddingVertical: 18,
    borderRightWidth: 1,
    borderRightColor: COLORS.BORDER,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 18,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
  },
  inputError: {
    borderColor: COLORS.ERROR,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.ERROR,
    marginTop: 8,
    marginLeft: 4,
  },
  sendButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 3,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sendButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  sendButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  termsText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
});

export default LoginScreen;
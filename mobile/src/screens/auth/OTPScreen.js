import React, { useState, useRef, useEffect } from 'react';
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
import { 
  verifyOTP, 
  sendOTP,
  selectAuth,
  selectAuthError, 
  clearError 
} from '../../store/slices/authSlice';

// Services
import { authValidation } from '../../services/api/auth';

// Constants
import { COLORS } from '../../constants/colors';

const OTPScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector(selectAuth);
  const error = useSelector(selectAuthError);
  
  // Route params
  const { phone, isExistingUser } = route.params;

  // Form state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Refs for OTP inputs
  const otpRefs = useRef([]);
  const nameRef = useRef();
  const emailRef = useRef();

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Clear errors and start animations
    dispatch(clearError());
    startAnimations();
    
    // Start resend timer
    startResendTimer();
    
    // Focus first OTP input
    setTimeout(() => {
      otpRefs.current[0]?.focus();
    }, 500);
  }, []);

  const startAnimations = () => {
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
  };

  const startResendTimer = () => {
    setCanResend(false);
    setResendTimer(60);
    
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle OTP input change
  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError('');

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (index === 5 && value) {
      const otpString = newOtp.join('');
      if (otpString.length === 6) {
        handleVerifyOTP(otpString);
      }
    }
  };

  // Handle backspace
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Validate and verify OTP
  const handleVerifyOTP = async (otpString = null) => {
    try {
      // Clear previous errors
      setOtpError('');
      setNameError('');
      setEmailError('');
      dispatch(clearError());

      const otpCode = otpString || otp.join('');

      // Validate OTP
      const otpValidation = authValidation.validateOTP(otpCode);
      if (!otpValidation.isValid) {
        setOtpError(otpValidation.error);
        return;
      }

      // For new users, validate name
      if (!isExistingUser) {
        const nameValidation = authValidation.validateName(name);
        if (!nameValidation.isValid) {
          setNameError(nameValidation.error);
          nameRef.current?.focus();
          return;
        }

        // Validate email if provided
        if (email) {
          const emailValidation = authValidation.validateEmail(email);
          if (!emailValidation.isValid) {
            setEmailError(emailValidation.error);
            emailRef.current?.focus();
            return;
          }
        }
      }

      // Dispatch verify OTP action
      await dispatch(verifyOTP({
        phone,
        otp: otpValidation.otp,
        name: !isExistingUser ? name.trim() : undefined,
        email: email ? email.trim() : undefined,
      })).unwrap();

      // Navigation is handled by AppNavigator based on auth state

    } catch (error) {
      console.error('Verify OTP error:', error);
      Alert.alert('Verification Failed', error || 'Invalid OTP. Please try again.');
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    try {
      await dispatch(sendOTP({ phone })).unwrap();
      setOtp(['', '', '', '', '', '']);
      startResendTimer();
      otpRefs.current[0]?.focus();
      Alert.alert('OTP Sent', 'A new verification code has been sent to your phone.');
    } catch (error) {
      Alert.alert('Error', error || 'Failed to resend OTP. Please try again.');
    }
  };

  // Handle back navigation
  const handleGoBack = () => {
    navigation.goBack();
  };

  const formatPhone = (phoneNumber) => {
    return `+91 ${phoneNumber.slice(0, 5)} ${phoneNumber.slice(5)}`;
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
          <View style={styles.iconContainer}>
            <Icon name="sms" size={40} color={COLORS.WHITE} />
          </View>
          <Text style={styles.title}>Verify Your Number</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.phoneNumber}>{formatPhone(phone)}</Text>
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
          {/* OTP Input */}
          <View style={styles.otpSection}>
            <Text style={styles.inputLabel}>Verification Code</Text>
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (otpRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    digit ? styles.otpInputFilled : {},
                    otpError ? styles.inputError : {},
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>
            
            {otpError ? (
              <Text style={styles.errorText}>{otpError}</Text>
            ) : null}
            
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </View>

          {/* New User Form */}
          {!isExistingUser && (
            <View style={styles.newUserSection}>
              <Text style={styles.sectionTitle}>Complete Your Profile</Text>
              
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  ref={nameRef}
                  style={[
                    styles.textInput,
                    nameError ? styles.inputError : {},
                  ]}
                  placeholder="Enter your full name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                />
                {nameError ? (
                  <Text style={styles.errorText}>{nameError}</Text>
                ) : null}
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email (Optional)</Text>
                <TextInput
                  ref={emailRef}
                  style={[
                    styles.textInput,
                    emailError ? styles.inputError : {},
                  ]}
                  placeholder="Enter your email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                />
                {emailError ? (
                  <Text style={styles.errorText}>{emailError}</Text>
                ) : null}
              </View>
            </View>
          )}

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              isLoading || otp.join('').length !== 6 ? styles.verifyButtonDisabled : {},
            ]}
            onPress={handleVerifyOTP}
            disabled={isLoading || otp.join('').length !== 6}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                isLoading || otp.join('').length !== 6
                  ? [COLORS.TEXT_DISABLED, COLORS.TEXT_DISABLED]
                  : COLORS.GRADIENT_PRIMARY
              }
              style={styles.verifyButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Icon name="refresh" size={20} color={COLORS.WHITE} />
                  <Text style={styles.verifyButtonText}>Verifying...</Text>
                </View>
              ) : (
                <Text style={styles.verifyButtonText}>
                  {isExistingUser ? 'Verify & Login' : 'Create Account'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Resend OTP */}
          <View style={styles.resendSection}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={!canResend}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.resendButton,
                !canResend ? styles.resendButtonDisabled : {},
              ]}>
                {canResend ? 'Resend OTP' : `Resend in ${resendTimer}s`}
              </Text>
            </TouchableOpacity>
          </View>
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.WHITE + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.WHITE + 'DD',
    textAlign: 'center',
    lineHeight: 22,
  },
  phoneNumber: {
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  form: {
    flex: 1,
  },
  otpSection: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.WHITE,
    elevation: 1,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  otpInputFilled: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY_LIGHT,
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
  newUserSection: {
    marginBottom: 30,
    padding: 16,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.WHITE,
  },
  verifyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 3,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  verifyButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  verifyButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginLeft: 8,
  },
  resendSection: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 8,
  },
  resendButton: {
    fontSize: 16,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  resendButtonDisabled: {
    color: COLORS.TEXT_DISABLED,
  },
});

export default OTPScreen;
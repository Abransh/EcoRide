import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Constants
import { COLORS } from '../../constants/colors';

const Button = ({
  title,
  onPress,
  variant = 'primary', // 'primary', 'secondary', 'outline', 'text'
  size = 'medium', // 'small', 'medium', 'large'
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left', // 'left', 'right'
  fullWidth = false,
  style,
  textStyle,
  ...props
}) => {
  const getButtonStyles = () => {
    const baseStyle = [styles.button];
    
    // Size variations
    switch (size) {
      case 'small':
        baseStyle.push(styles.buttonSmall);
        break;
      case 'large':
        baseStyle.push(styles.buttonLarge);
        break;
      default:
        baseStyle.push(styles.buttonMedium);
    }

    // Full width
    if (fullWidth) {
      baseStyle.push(styles.buttonFullWidth);
    }

    // Disabled state
    if (disabled || loading) {
      baseStyle.push(styles.buttonDisabled);
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        baseStyle.push(styles.buttonSecondary);
        break;
      case 'outline':
        baseStyle.push(styles.buttonOutline);
        break;
      case 'text':
        baseStyle.push(styles.buttonText);
        break;
      default:
        // Primary uses gradient, no additional style needed
        break;
    }

    return baseStyle;
  };

  const getTextStyles = () => {
    const baseStyle = [styles.buttonText];
    
    // Size variations
    switch (size) {
      case 'small':
        baseStyle.push(styles.textSmall);
        break;
      case 'large':
        baseStyle.push(styles.textLarge);
        break;
      default:
        baseStyle.push(styles.textMedium);
    }

    // Variant text colors
    switch (variant) {
      case 'secondary':
        baseStyle.push(styles.textSecondary);
        break;
      case 'outline':
        baseStyle.push(styles.textOutline);
        break;
      case 'text':
        baseStyle.push(styles.textOnly);
        break;
      default:
        baseStyle.push(styles.textPrimary);
    }

    // Disabled state
    if (disabled || loading) {
      baseStyle.push(styles.textDisabled);
    }

    return baseStyle;
  };

  const getGradientColors = () => {
    if (disabled || loading) {
      return [COLORS.TEXT_DISABLED, COLORS.TEXT_DISABLED];
    }

    switch (variant) {
      case 'secondary':
        return COLORS.GRADIENT_SECONDARY;
      case 'outline':
      case 'text':
        return [COLORS.TRANSPARENT, COLORS.TRANSPARENT];
      default:
        return COLORS.GRADIENT_PRIMARY;
    }
  };

  const renderContent = () => {
    const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size={size === 'small' ? 'small' : 'small'} 
            color={variant === 'outline' || variant === 'text' ? COLORS.PRIMARY : COLORS.WHITE} 
          />
          {title && <Text style={[getTextStyles(), styles.loadingText]}>{title}</Text>}
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        {icon && iconPosition === 'left' && (
          <Icon 
            name={icon} 
            size={iconSize} 
            color={
              disabled 
                ? COLORS.TEXT_DISABLED 
                : variant === 'outline' || variant === 'text' 
                  ? COLORS.PRIMARY 
                  : COLORS.WHITE
            } 
            style={styles.iconLeft}
          />
        )}
        
        {title && (
          <Text style={[getTextStyles(), textStyle]}>{title}</Text>
        )}
        
        {icon && iconPosition === 'right' && (
          <Icon 
            name={icon} 
            size={iconSize} 
            color={
              disabled 
                ? COLORS.TEXT_DISABLED 
                : variant === 'outline' || variant === 'text' 
                  ? COLORS.PRIMARY 
                  : COLORS.WHITE
            } 
            style={styles.iconRight}
          />
        )}
      </View>
    );
  };

  if (variant === 'primary' || variant === 'secondary') {
    return (
      <TouchableOpacity
        style={[getButtonStyles(), style]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        {...props}
      >
        <LinearGradient
          colors={getGradientColors()}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonSmall: {
    minHeight: 36,
  },
  buttonMedium: {
    minHeight: 48,
  },
  buttonLarge: {
    minHeight: 56,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonSecondary: {
    // Handled by gradient
  },
  buttonOutline: {
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.TRANSPARENT,
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: {
    backgroundColor: COLORS.TRANSPARENT,
    elevation: 0,
    shadowOpacity: 0,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  textSmall: {
    fontSize: 14,
  },
  textMedium: {
    fontSize: 16,
  },
  textLarge: {
    fontSize: 18,
  },
  textPrimary: {
    color: COLORS.WHITE,
  },
  textSecondary: {
    color: COLORS.WHITE,
  },
  textOutline: {
    color: COLORS.PRIMARY,
  },
  textOnly: {
    color: COLORS.PRIMARY,
  },
  textDisabled: {
    color: COLORS.TEXT_DISABLED,
  },
  loadingText: {
    marginLeft: 8,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default Button;
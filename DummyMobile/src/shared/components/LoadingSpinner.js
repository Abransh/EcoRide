/**
 * Component: LoadingSpinner
 * Purpose: Reusable loading spinner component with consistent styling
 * Props:
 *   - size: 'small' | 'medium' | 'large'
 *   - color: Spinner color
 *   - overlay: boolean - whether to show as overlay
 *   - text: Loading text to display
 * Dependencies: Theme
 */

import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
} from 'react-native';
import { Colors, Typography, Spacing } from '../theme';

const LoadingSpinner = ({
  size = 'medium',
  color = Colors.primary,
  overlay = false,
  text = null,
  style = {},
}) => {
  const spinnerSize = {
    small: 'small',
    medium: 'large',
    large: 'large',
  }[size];

  const containerStyles = [
    styles.container,
    overlay && styles.overlay,
    style,
  ];

  return (
    <View style={containerStyles}>
      <ActivityIndicator size={spinnerSize} color={color} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  text: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default LoadingSpinner;

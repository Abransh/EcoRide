/**
 * Component: EcoCard
 * Purpose: Reusable card component with consistent styling and shadows
 * Props:
 *   - children: Child components to render inside the card
 *   - style: Additional styles
 *   - onPress: Function to call when card is pressed (makes it touchable)
 *   - shadow: Shadow level ('none', 'small', 'medium', 'large')
 *   - padding: Padding level ('none', 'small', 'medium', 'large')
 * Dependencies: Theme
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme';

const EcoCard = ({
  children,
  style = {},
  onPress,
  shadow = 'small',
  padding = 'medium',
  ...props
}) => {
  const cardStyles = [
    styles.base,
    styles[`shadow${shadow.charAt(0).toUpperCase() + shadow.slice(1)}`],
    styles[`padding${padding.charAt(0).toUpperCase() + padding.slice(1)}`],
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.95}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyles} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
  },

  // Shadow variations
  shadowNone: {
    // No shadow
  },
  shadowSmall: {
    ...Shadows.small,
  },
  shadowMedium: {
    ...Shadows.medium,
  },
  shadowLarge: {
    ...Shadows.large,
  },

  // Padding variations
  paddingNone: {
    padding: 0,
  },
  paddingSmall: {
    padding: Spacing.sm,
  },
  paddingMedium: {
    padding: Spacing.md,
  },
  paddingLarge: {
    padding: Spacing.lg,
  },
});

export default EcoCard;

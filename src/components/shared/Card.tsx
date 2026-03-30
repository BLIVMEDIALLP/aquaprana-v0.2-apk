import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../lib/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  shadow?: boolean;
  padding?: keyof typeof SPACING;
}

export function Card({
  children,
  style,
  shadow = true,
  padding = 'lg',
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        shadow && styles.shadow,
        { padding: SPACING[padding] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});

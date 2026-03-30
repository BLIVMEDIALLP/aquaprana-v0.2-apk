import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../lib/theme';

export type BadgeColor = 'green' | 'blue' | 'amber' | 'red' | 'gray';

interface BadgeProps {
  label: string;
  color?: BadgeColor;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const BG: Record<BadgeColor, string> = {
  green: '#e6f9f0',
  blue: COLORS.primaryLight,
  amber: '#fef6e4',
  red: '#fdecea',
  gray: '#f0f2f5',
};

const FG: Record<BadgeColor, string> = {
  green: COLORS.green,
  blue: COLORS.primary,
  amber: COLORS.amber,
  red: COLORS.red,
  gray: COLORS.muted,
};

export function Badge({ label, color = 'blue', style, textStyle }: BadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: BG[color] },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: FG[color] },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    letterSpacing: 0.2,
  },
});

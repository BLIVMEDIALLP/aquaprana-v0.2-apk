import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../../lib/theme';

export type DotColor = 'green' | 'blue' | 'red' | 'gray' | 'amber';

interface StatusDotProps {
  color?: DotColor;
  size?: number;
  style?: ViewStyle;
}

const DOT_COLORS: Record<DotColor, string> = {
  green: COLORS.green,
  blue: COLORS.primary,
  red: COLORS.red,
  gray: COLORS.muted,
  amber: COLORS.amber,
};

export function StatusDot({ color = 'gray', size = 8, style }: StatusDotProps) {
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: DOT_COLORS[color],
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    // base style — dimensions and borderRadius set dynamically above
  },
});

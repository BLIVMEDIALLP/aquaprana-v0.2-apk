import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '../../lib/theme';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
}

export function LoadingSpinner({
  message,
  size = 'large',
}: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={COLORS.primary} />
      {message ? (
        <Text style={styles.message}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  message: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.muted,
    textAlign: 'center',
  },
});

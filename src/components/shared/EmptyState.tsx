import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Ionicons name={icon} size={44} color={COLORS.primary} />
      </View>

      <Text style={styles.title}>{title}</Text>

      {message ? (
        <Text style={styles.message}>{message}</Text>
      ) : null}

      {action ? (
        <TouchableOpacity
          style={styles.button}
          onPress={action.onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.xxl,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: FONTS.sizes.md,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
});

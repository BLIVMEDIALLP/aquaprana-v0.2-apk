import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../../lib/theme';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    accessibilityLabel?: string;
  };
}

export function Header({ title, onBack, rightAction }: HeaderProps) {
  return (
    <View style={styles.container}>
      {/* Left: back button or spacer */}
      <View style={styles.side}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.iconBtn}
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      {/* Center: title */}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Right: optional action */}
      <View style={styles.side}>
        {rightAction ? (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={styles.iconBtn}
            accessibilityLabel={rightAction.accessibilityLabel ?? 'Action'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={rightAction.icon} size={22} color={COLORS.white} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>
    </View>
  );
}

const HEADER_HEIGHT = Platform.OS === 'ios' ? 52 : 56;

const styles = StyleSheet.create({
  container: {
    height: HEADER_HEIGHT,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  side: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
  },
});

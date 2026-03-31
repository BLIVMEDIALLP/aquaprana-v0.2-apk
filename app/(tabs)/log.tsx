import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS, FONTS, SPACING, RADIUS } from '../../src/lib/theme';
import type { Pond } from '../../src/lib/types';

/* ─── Empty State ─── */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="clipboard-outline" size={64} color={COLORS.muted} />
      <Text style={styles.emptyTitle}>Create a pond first</Text>
      <Text style={styles.emptySubtitle}>
        You need at least one active pond before you can log water quality data.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onCreate}>
        <Text style={styles.emptyBtnText}>Create a pond</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─── Screen ─── */

export default function LogTab() {
  const router = useRouter();
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [loading, setLoading] = useState(true);
  const [redirected, setRedirected] = useState(false);

  const loadPonds = useCallback(async () => {
    setLoading(true);
    setRedirected(false);
    try {
      const raw = await AsyncStorage.getItem('aquaprana_ponds');
      const all: Pond[] = raw ? JSON.parse(raw) : [];
      const active = all.filter((p) => p.is_active);
      setPonds(active);

      if (active.length === 1) {
        // Redirect directly if only one pond
        router.replace(`/log/new?pondId=${active[0]._id}`);
        setRedirected(true);
      }
    } catch (e) {
      console.error('LogTab load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPonds();
    }, [loadPonds])
  );

  // Show spinner while loading or redirecting
  if (loading || redirected) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // No ponds
  if (ponds.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.grayBg} />
        <EmptyState onCreate={() => router.push('/pond/setup')} />
      </SafeAreaView>
    );
  }

  // Multiple ponds — show picker
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Log Water Quality</Text>
        <Text style={styles.headerSub}>Select a pond to log today's data</Text>
      </View>

      <View style={styles.pickerHint}>
        <Ionicons name="water-outline" size={16} color={COLORS.primary} />
        <Text style={styles.pickerHintText}>Select a pond to log</Text>
      </View>

      <FlatList
        data={ponds}
        keyExtractor={(p) => p._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.pondRow}
            onPress={() => router.push(`/log/new?pondId=${item._id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.pondIconCircle}>
              <Ionicons name="fish-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.pondName} numberOfLines={1}>
              {item.name}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.grayBg,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  headerSub: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  pickerHintText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium,
  },
  listContent: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  pondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    minHeight: 64,
    gap: SPACING.md,
  },
  pondIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pondName: {
    flex: 1,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.lg + 40 + SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
});

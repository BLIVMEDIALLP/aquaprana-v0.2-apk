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
import type { Pond, CropCycle } from '../../src/lib/types';

/* ─── Helpers ─── */

function daysSince(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function getSpeciesLabel(key: string): string {
  const map: Record<string, string> = {
    vannamei: 'Vannamei',
    monodon: 'Tiger Prawn',
    indian_white: 'Indian White',
    banana_prawn: 'Banana Prawn',
    rosenbergii: 'Golda Prawn',
    river_scampi: 'River Scampi',
    rohu: 'Rohu',
    catla: 'Katla',
    mrigal: 'Mrigal',
    common_carp: 'Common Carp',
    grass_carp: 'Grass Carp',
    tilapia: 'Tilapia',
    pangasius: 'Basa',
    murrel: 'Murrel',
    seabass: 'Barramundi',
    milkfish: 'Milkfish',
    pompano: 'Pompano',
    mullet: 'Mullet',
    grouper: 'Grouper',
    red_snapper: 'Red Snapper',
    mud_crab: 'Mud Crab',
    blue_crab: 'Blue Crab',
    pacific_oyster: 'Pacific Oyster',
    green_mussel: 'Green Mussel',
    kappaphycus: 'Cottonii',
    gracilaria: 'Gracilaria',
    other: 'Other',
  };
  return map[key] ?? key;
}

/* ─── Pond Overview Card ─── */

interface OverviewCardProps {
  pond: Pond;
  cycle: CropCycle | null;
  onPress: () => void;
}

function OverviewCard({ pond, cycle, onPress }: OverviewCardProps) {
  const dayNum = cycle ? daysSince(cycle.stocking_date) + 1 : null;
  const harvestCountdown =
    cycle?.harvest_window_start ? daysUntil(cycle.harvest_window_start) : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Row 1: name + species badge */}
      <View style={styles.cardRow}>
        <Text style={styles.cardName} numberOfLines={1}>
          {pond.name}
        </Text>
        {cycle ? (
          <View style={styles.speciesBadge}>
            <Text style={styles.speciesBadgeText}>{getSpeciesLabel(cycle.species)}</Text>
          </View>
        ) : (
          <View style={[styles.speciesBadge, styles.speciesBadgeInactive]}>
            <Text style={[styles.speciesBadgeText, styles.speciesBadgeTextInactive]}>
              No cycle
            </Text>
          </View>
        )}
      </View>

      {/* Row 2: day count + harvest countdown */}
      <View style={styles.cardRow}>
        <View style={styles.statChip}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
          <Text style={styles.statChipText}>
            {dayNum != null ? `Day ${dayNum}` : 'Idle'}
          </Text>
        </View>
        {harvestCountdown != null && (
          <View style={[styles.statChip, { backgroundColor: '#fff3cd' }]}>
            <Ionicons name="time-outline" size={14} color={COLORS.amber} />
            <Text style={[styles.statChipText, { color: COLORS.amber }]}>
              Harvest in {harvestCountdown}d
            </Text>
          </View>
        )}
        {cycle?.status === 'closed' && (
          <View style={[styles.statChip, { backgroundColor: '#d4edda' }]}>
            <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.green} />
            <Text style={[styles.statChipText, { color: COLORS.green }]}>Closed</Text>
          </View>
        )}
      </View>

      {/* Row 3: area + stocking density */}
      {(pond.area_acres || cycle?.stocking_density) ? (
        <View style={styles.cardRow}>
          {pond.area_acres ? (
            <Text style={styles.metaText}>{pond.area_acres} acres</Text>
          ) : null}
          {cycle?.stocking_density ? (
            <Text style={styles.metaText}>
              {cycle.stocking_density.toLocaleString()} seed/acre
            </Text>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

/* ─── Empty State ─── */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="fish-outline" size={72} color={COLORS.primary} />
      <Text style={styles.emptyTitle}>No ponds yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first pond to start tracking crop cycles and water quality.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onCreate}>
        <Text style={styles.emptyBtnText}>Create Pond</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─── Screen ─── */

interface PondWithCycle {
  pond: Pond;
  cycle: CropCycle | null;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<PondWithCycle[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pondsRaw, cyclesRaw] = await Promise.all([
        AsyncStorage.getItem('aquaprana_ponds'),
        AsyncStorage.getItem('aquaprana_cycles'),
      ]);

      const ponds: Pond[] = pondsRaw ? JSON.parse(pondsRaw) : [];
      const cycles: CropCycle[] = cyclesRaw ? JSON.parse(cyclesRaw) : [];

      const activePonds = ponds.filter((p) => p.is_active);

      const enriched: PondWithCycle[] = activePonds.map((pond) => {
        const pondCycles = cycles
          .filter((c) => c.pond_id === pond._id)
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        const activeCycle =
          pondCycles.find((c) => c.status === 'active') ?? pondCycles[0] ?? null;
        return { pond, cycle: activeCycle };
      });

      setData(enriched);
    } catch (e) {
      console.error('DashboardScreen load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pond Overview</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/pond/setup')}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : data.length === 0 ? (
        <EmptyState onCreate={() => router.push('/pond/setup')} />
      ) : (
        <>
          <FlatList
            data={data}
            keyExtractor={(item) => item.pond._id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <OverviewCard
                pond={item.pond}
                cycle={item.cycle}
                onPress={() => router.push(`/pond/${item.pond._id}`)}
              />
            )}
          />
          <View style={styles.footerHint}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.muted} />
            <Text style={styles.footerHintText}>Tap a pond to view its dashboard</Text>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.grayBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  addBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 72,
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: SPACING.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  cardName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  speciesBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  speciesBadgeInactive: {
    backgroundColor: COLORS.grayBg,
  },
  speciesBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
  },
  speciesBadgeTextInactive: {
    color: COLORS.muted,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    gap: 4,
  },
  statChipText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
  },
  metaText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.muted,
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
  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    backgroundColor: COLORS.grayBg,
  },
  footerHintText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.muted,
  },
});

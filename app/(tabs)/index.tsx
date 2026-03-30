import React, { useCallback, useEffect, useState } from 'react';
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
import type { Pond, CropCycle, PondLog } from '../../src/lib/types';

/* ─── helpers ─── */

function daysSince(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function getWaterQualityColor(log: PondLog | null): string {
  if (!log) return COLORS.muted;
  const { do_mgl, ph, ammonia_mgl } = log;
  if (
    (do_mgl != null && (do_mgl < 4 || do_mgl > 10)) ||
    (ph != null && (ph < 7.5 || ph > 8.5)) ||
    (ammonia_mgl != null && ammonia_mgl > 0.1)
  ) {
    return COLORS.red;
  }
  if (do_mgl != null || ph != null || ammonia_mgl != null) return COLORS.green;
  return COLORS.primary;
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

/* ─── Card ─── */

interface PondCardProps {
  pond: Pond;
  cycle: CropCycle | null;
  lastLog: PondLog | null;
  onPress: () => void;
}

function PondCard({ pond, cycle, lastLog, onPress }: PondCardProps) {
  const dayNum = cycle ? daysSince(cycle.stocking_date) + 1 : null;
  const harvestCountdown =
    cycle?.harvest_window_start ? daysUntil(cycle.harvest_window_start) : null;
  const wqColor = getWaterQualityColor(lastLog);
  const hasLogToday = lastLog ? isToday(lastLog.observed_at ?? lastLog.created_at) : false;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Row 1: name + species */}
      <View style={styles.cardRow}>
        <Text style={styles.cardName} numberOfLines={1}>
          {pond.name}
        </Text>
        {cycle && (
          <View style={styles.speciesBadge}>
            <Text style={styles.speciesBadgeText}>{getSpeciesLabel(cycle.species)}</Text>
          </View>
        )}
      </View>

      {/* Row 2: Day X + harvest + WQ dot */}
      <View style={styles.cardRow}>
        <Text style={styles.cardMeta}>
          {dayNum != null ? `Day ${dayNum}` : 'No active cycle'}
          {harvestCountdown != null && harvestCountdown > 0
            ? `  ·  Harvest in ${harvestCountdown}d`
            : ''}
        </Text>
        <View style={[styles.wqDot, { backgroundColor: wqColor }]} />
      </View>

      {/* Row 3: Biomass + Survival */}
      {lastLog && (
        <View style={styles.cardRow}>
          <Text style={styles.cardStat}>
            Biomass:{' '}
            <Text style={styles.cardStatVal}>
              {lastLog.biomass_kg != null ? `${lastLog.biomass_kg} kg` : '—'}
            </Text>
          </Text>
          <Text style={styles.cardStat}>
            Survival:{' '}
            <Text style={styles.cardStatVal}>
              {lastLog.biomass_kg != null && cycle
                ? '—'
                : '—'}
            </Text>
          </Text>
        </View>
      )}

      {/* Row 4: Last log */}
      <View style={styles.cardRow}>
        <Ionicons
          name="time-outline"
          size={12}
          color={hasLogToday ? COLORS.green : COLORS.amber}
        />
        <Text
          style={[
            styles.cardTimestamp,
            { color: hasLogToday ? COLORS.muted : COLORS.amber },
          ]}
        >
          {lastLog
            ? `  Last log: ${formatRelativeTime(lastLog.observed_at ?? lastLog.created_at)}`
            : '  No logs yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/* ─── EmptyState ─── */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="fish-outline" size={72} color={COLORS.primary} />
      <Text style={styles.emptyTitle}>No ponds yet</Text>
      <Text style={styles.emptySubtitle}>
        Start tracking your aquaculture operations by creating your first pond.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onCreate}>
        <Text style={styles.emptyBtnText}>Create your first pond</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─── Screen ─── */

interface PondWithMeta {
  pond: Pond;
  cycle: CropCycle | null;
  lastLog: PondLog | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const [items, setItems] = useState<PondWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync] = useState(new Date());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pondsRaw, cyclesRaw, logsRaw] = await Promise.all([
        AsyncStorage.getItem('aquaprana_ponds'),
        AsyncStorage.getItem('aquaprana_cycles'),
        AsyncStorage.getItem('aquaprana_logs'),
      ]);

      const ponds: Pond[] = pondsRaw ? JSON.parse(pondsRaw) : [];
      const cycles: CropCycle[] = cyclesRaw ? JSON.parse(cyclesRaw) : [];
      const logs: PondLog[] = logsRaw ? JSON.parse(logsRaw) : [];

      const activePonds = ponds.filter((p) => p.is_active);

      const enriched: PondWithMeta[] = activePonds.map((pond) => {
        const pondCycles = cycles
          .filter((c) => c.pond_id === pond._id)
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        const activeCycle = pondCycles.find((c) => c.status === 'active') ?? pondCycles[0] ?? null;

        const pondLogs = logs
          .filter((l) => l.pond_id === pond._id)
          .sort(
            (a, b) =>
              new Date(b.observed_at ?? b.created_at).getTime() -
              new Date(a.observed_at ?? a.created_at).getTime()
          );
        const lastLog = pondLogs[0] ?? null;

        return { pond, cycle: activeCycle, lastLog };
      });

      setItems(enriched);
    } catch (e) {
      console.error('HomeScreen load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const goToSetup = () => router.push('/pond/setup');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Ponds</Text>
        <View style={styles.headerRight}>
          <View style={styles.syncDot} />
          <Text style={styles.syncText}>
            {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <TouchableOpacity style={styles.addBtn} onPress={goToSetup}>
            <Ionicons name="add" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : items.length === 0 ? (
        <EmptyState onCreate={goToSetup} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.pond._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <PondCard
              pond={item.pond}
              cycle={item.cycle}
              lastLog={item.lastLog}
              onPress={() => router.push(`/pond/${item.pond._id}`)}
            />
          )}
        />
      )}

      {/* FAB */}
      {items.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={goToSetup}>
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  syncText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.muted,
  },
  addBtn: {
    padding: SPACING.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
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
    gap: SPACING.xs + 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    paddingVertical: 2,
  },
  speciesBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
  },
  cardMeta: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.muted,
    flex: 1,
  },
  wqDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardStat: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.muted,
  },
  cardStatVal: {
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  cardTimestamp: {
    fontSize: FONTS.sizes.xs,
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
  },
  emptyBtnText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});

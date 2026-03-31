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
      {/* Left accent stripe */}
      <View style={[styles.cardAccent, { backgroundColor: wqColor }]} />

      <View style={styles.cardContent}>
        {/* Row 1: name + species + day badge */}
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {pond.name}
            </Text>
            <Text style={styles.cardArea}>
              {pond.area_acres != null ? `${pond.area_acres} ac` : ''}
              {pond.area_acres != null && pond.depth_ft != null ? '  ·  ' : ''}
              {pond.depth_ft != null ? `${pond.depth_ft}ft` : ''}
            </Text>
          </View>
          <View style={styles.badgeGroup}>
            {cycle && (
              <View style={styles.speciesBadge}>
                <Text style={styles.speciesBadgeText}>{getSpeciesLabel(cycle.species)}</Text>
              </View>
            )}
            {dayNum != null && (
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>Day {dayNum}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Row 2: Harvest countdown */}
        {harvestCountdown != null && harvestCountdown > 0 && (
          <View style={styles.harvestRow}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.amber} />
            <Text style={styles.harvestText}>  Harvest in {harvestCountdown} days</Text>
          </View>
        )}

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Row 3: WQ + Biomass stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.wqDot, { backgroundColor: wqColor }]} />
            <Text style={styles.statLabel}>Water Quality</Text>
          </View>
          {lastLog?.do_mgl != null && (
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{lastLog.do_mgl}</Text>
              <Text style={styles.statUnit}> mg/L DO</Text>
            </View>
          )}
          {lastLog?.ph != null && (
            <View style={styles.statItem}>
              <Text style={styles.statVal}>pH {lastLog.ph}</Text>
            </View>
          )}
          {lastLog?.biomass_kg != null && (
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{lastLog.biomass_kg}</Text>
              <Text style={styles.statUnit}> kg</Text>
            </View>
          )}
        </View>

        {/* Row 4: Last log */}
        <View style={styles.timestampRow}>
          <Ionicons
            name={hasLogToday ? 'checkmark-circle' : 'time-outline'}
            size={12}
            color={hasLogToday ? COLORS.green : COLORS.amber}
          />
          <Text
            style={[
              styles.cardTimestamp,
              { color: hasLogToday ? COLORS.green : COLORS.amber },
            ]}
          >
            {lastLog
              ? `  Last log: ${formatRelativeTime(lastLog.observed_at ?? lastLog.created_at)}`
              : '  No logs yet — tap to log'}
          </Text>
        </View>
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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Ponds</Text>
          <Text style={styles.headerSub}>
            {items.length > 0
              ? `${items.length} active pond${items.length !== 1 ? 's' : ''}`
              : 'No ponds yet'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.syncBadge}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>Live</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={goToSetup}>
            <Ionicons name="add" size={22} color={COLORS.white} />
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    gap: 4,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  syncText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: FONTS.weights.medium,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    paddingBottom: 100,
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardAccent: {
    width: 4,
    borderRadius: 0,
  },
  cardContent: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.xs + 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  cardArea: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.muted,
    marginTop: 2,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: SPACING.sm,
  },
  speciesBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  speciesBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
  },
  dayBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  dayBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.green,
  },
  harvestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  harvestText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.amber,
    fontWeight: FONTS.weights.medium,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statVal: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  statUnit: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.muted,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.muted,
    marginLeft: 4,
  },
  wqDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
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

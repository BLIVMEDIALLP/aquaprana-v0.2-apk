import React, { useEffect, useState, useCallback, JSX } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONTS, SPACING, RADIUS } from '../../src/lib/theme';
import type { Pond, CropCycle, PondLog } from '../../src/lib/types';
import { SPECIES_LIST } from '../../src/lib/types';
import {
  Header,
  LoadingSpinner,
  Badge,
  StatusDot,
} from '../../src/components/shared';

/* ─── Constants ─── */

const STORAGE_KEYS = {
  PONDS: 'aquaprana_ponds',
  CYCLES: 'aquaprana_cycles',
  LOGS: 'aquaprana_logs',
} as const;

const SCREEN_WIDTH = Dimensions.get('window').width;

/* ─── Helper: species label from key ─── */

function getSpeciesLabel(key: string): string {
  for (const group of SPECIES_LIST) {
    const found = group.species.find((s) => s.key === key);
    if (found) return found.label;
  }
  return key;
}

/* ─── Helper: format relative time ─── */

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

/* ─── Helper: format date for log rows ─── */

function formatLogDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/* ─── Helper: is same day ─── */

function isSameDay(isoString: string): boolean {
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/* ─── Water Quality Tile Color Logic ─── */

type TileStatus = 'green' | 'blue' | 'red' | 'gray';

interface TileConfig {
  key: keyof PondLog;
  label: string;
  unit: string;
  getStatus: (val: number) => TileStatus;
}

const TILE_BG: Record<TileStatus, string> = {
  green: '#e6f9f0',
  blue: COLORS.primaryLight,
  red: '#fdecea',
  gray: '#f0f2f5',
};

const TILE_DOT: Record<TileStatus, string> = {
  green: COLORS.green,
  blue: COLORS.primary,
  red: COLORS.red,
  gray: COLORS.muted,
};

const TILE_TEXT: Record<TileStatus, string> = {
  green: '#1a5c38',
  blue: COLORS.primary,
  red: '#922b21',
  gray: COLORS.muted,
};

const WQ_TILES: TileConfig[] = [
  {
    key: 'do_mgl',
    label: 'DO',
    unit: 'mg/L',
    getStatus: (v) => {
      if (v >= 4 && v <= 10) return 'green';
      if ((v >= 3 && v < 4) || (v > 10 && v <= 12)) return 'blue';
      return 'red';
    },
  },
  {
    key: 'ph',
    label: 'pH',
    unit: '',
    getStatus: (v) => {
      if (v >= 7.5 && v <= 8.5) return 'green';
      if ((v >= 7.0 && v < 7.5) || (v > 8.5 && v <= 9.0)) return 'blue';
      return 'red';
    },
  },
  {
    key: 'temp_c',
    label: 'Temp',
    unit: '°C',
    getStatus: (v) => {
      if (v >= 26 && v <= 32) return 'green';
      if ((v >= 24 && v < 26) || (v > 32 && v <= 34)) return 'blue';
      return 'red';
    },
  },
  {
    key: 'salinity_ppt',
    label: 'Salinity',
    unit: 'ppt',
    getStatus: (_v) => 'blue',
  },
  {
    key: 'ammonia_mgl',
    label: 'NH\u2083',
    unit: 'mg/L',
    getStatus: (v) => {
      if (v <= 0.1) return 'green';
      if (v <= 0.3) return 'blue';
      return 'red';
    },
  },
  {
    key: 'calcium_mgl',
    label: 'Ca',
    unit: 'mg/L',
    getStatus: (v) => {
      if (v >= 75) return 'green';
      if (v >= 50) return 'blue';
      return 'red';
    },
  },
  {
    key: 'magnesium_mgl',
    label: 'Mg',
    unit: 'mg/L',
    getStatus: (v) => {
      if (v >= 100) return 'green';
      if (v >= 75) return 'blue';
      return 'red';
    },
  },
  {
    key: 'potassium_mgl',
    label: 'K',
    unit: 'mg/L',
    getStatus: (v) => {
      if (v >= 5) return 'green';
      if (v >= 3) return 'blue';
      return 'red';
    },
  },
];

/* ─── Computed metrics ─── */

interface BiomassMetrics {
  abwG: number | null;
  abwStale: boolean;
  biomassKg: number | null;
  survivalPct: number | null;
  fcr: number | null;
  totalFeedKg: number;
  totalMortality: number;
  mortalityAlert: boolean;
  stockedCount: number;
}

function computeMetrics(
  cycle: CropCycle,
  pond: Pond,
  logs: PondLog[]
): BiomassMetrics {
  const areaM2 = (pond.area_acres ?? 1) * 4047;
  const stockedCount = cycle.stocking_density * areaM2;

  const totalFeedKg = logs.reduce((s, l) => s + (l.feed_qty_kg ?? 0), 0);
  const totalMortality = logs.reduce((s, l) => s + (l.mortality_count ?? 0), 0);

  const survived = stockedCount - totalMortality;
  const survivalPct = stockedCount > 0 ? (survived / stockedCount) * 100 : null;

  // Last log with abw
  const abwLog = logs.find((l) => l.abw_g != null);
  const abwG = abwLog?.abw_g ?? null;
  const abwStale = abwLog
    ? Date.now() - new Date(abwLog.observed_at).getTime() > 7 * 86400000
    : false;

  // Last log with biomass
  const biomassLog = logs.find((l) => l.biomass_kg != null);
  const biomassKg = biomassLog?.biomass_kg ?? null;

  const fcr =
    totalFeedKg > 0 && biomassKg != null && biomassKg > 0
      ? totalFeedKg / biomassKg
      : null;

  // Today's mortality alert: > 0.5% of stocked
  const todaysLogs = logs.filter((l) => isSameDay(l.observed_at));
  const todayMortality = todaysLogs.reduce((s, l) => s + (l.mortality_count ?? 0), 0);
  const mortalityAlert = stockedCount > 0 && todayMortality / stockedCount > 0.005;

  return {
    abwG,
    abwStale,
    biomassKg,
    survivalPct,
    fcr,
    totalFeedKg,
    totalMortality,
    mortalityAlert,
    stockedCount,
  };
}

/* ─── Sparkline helper for Trends tab ─── */

interface SparklineProps {
  values: number[];
  color: string;
}

function Sparkline({ values, color }: SparklineProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const barMaxH = 32;
  const barW = Math.min(18, (SCREEN_WIDTH - SPACING.xxl * 4) / values.length);

  return (
    <View style={sparkStyles.row}>
      {values.map((v, i) => {
        const h = Math.max(4, ((v - min) / range) * barMaxH);
        return (
          <View key={i} style={[sparkStyles.barWrap, { width: barW }]}>
            <View
              style={[
                sparkStyles.bar,
                { height: h, backgroundColor: color },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const sparkStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 36,
    marginVertical: SPACING.xs,
  },
  barWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 1,
    height: 36,
  },
  bar: {
    borderRadius: 2,
    minHeight: 4,
  },
});

/* ═══════════════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════════════ */

type TabName = 'Logs' | 'Trends' | 'Cycles';

export default function PondDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const pondId = id ?? '';

  const [loading, setLoading] = useState(true);
  const [pond, setPond] = useState<Pond | null>(null);
  const [activeCycle, setActiveCycle] = useState<CropCycle | null>(null);
  const [allCycles, setAllCycles] = useState<CropCycle[]>([]);
  const [logs, setLogs] = useState<PondLog[]>([]);
  const [activeTab, setActiveTab] = useState<TabName>('Logs');

  /* ─── Load data ─── */

  const loadData = useCallback(async () => {
    try {
      const [pondsRaw, cyclesRaw, logsRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PONDS),
        AsyncStorage.getItem(STORAGE_KEYS.CYCLES),
        AsyncStorage.getItem(STORAGE_KEYS.LOGS),
      ]);

      const ponds: Pond[] = pondsRaw ? JSON.parse(pondsRaw) : [];
      const cycles: CropCycle[] = cyclesRaw ? JSON.parse(cyclesRaw) : [];
      const allLogs: PondLog[] = logsRaw ? JSON.parse(logsRaw) : [];

      const foundPond = ponds.find((p) => p._id === pondId) ?? null;
      setPond(foundPond);

      const pondCycles = cycles.filter((c) => c.pond_id === pondId);
      setAllCycles(pondCycles);

      const cycle = pondCycles.find((c) => c.status === 'active') ?? null;
      setActiveCycle(cycle);

      if (cycle) {
        const cycleLogs = allLogs
          .filter((l) => l.cycle_id === cycle._id)
          .sort(
            (a, b) =>
              new Date(b.observed_at).getTime() -
              new Date(a.observed_at).getTime()
          );
        setLogs(cycleLogs);
      } else {
        setLogs([]);
      }
    } catch (e) {
      console.error('PondDashboard load error', e);
    } finally {
      setLoading(false);
    }
  }, [pondId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ─── Loading / Not found ─── */

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Pond Dashboard" onBack={() => router.back()} />
        <LoadingSpinner message="Loading pond data…" />
      </SafeAreaView>
    );
  }

  if (!pond) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Pond Not Found" onBack={() => router.back()} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.muted} />
          <Text style={styles.notFoundText}>Pond not found</Text>
          <Text style={styles.notFoundSub}>
            This pond may have been deleted or the link is invalid.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ─── Derived values ─── */

  const speciesLabel = activeCycle
    ? getSpeciesLabel(activeCycle.species)
    : null;

  const dayNumber = activeCycle
    ? Math.floor(
        (Date.now() - new Date(activeCycle.stocking_date).getTime()) / 86400000
      ) + 1
    : null;

  function getHarvestText(): { text: string; color: string } | null {
    if (!activeCycle) return null;
    const { harvest_window_start, harvest_window_end } = activeCycle;
    if (!harvest_window_start || !harvest_window_end) return null;

    const now = Date.now();
    const startMs = new Date(harvest_window_start).getTime();
    const endMs = new Date(harvest_window_end).getTime();

    if (now < startMs) {
      const daysToStart = Math.ceil((startMs - now) / 86400000);
      const daysToEnd = Math.ceil((endMs - now) / 86400000);
      return { text: `Ready in ${daysToStart}d\u2013${daysToEnd}d`, color: COLORS.green };
    }
    if (now >= startMs && now <= endMs) {
      return { text: 'Harvest window open', color: COLORS.amber };
    }
    return { text: 'Past harvest window', color: COLORS.red };
  }

  const harvestInfo = getHarvestText();

  const metrics = activeCycle
    ? computeMetrics(activeCycle, pond, logs)
    : null;

  const lastLog = logs[0] ?? null;
  const loggedToday = lastLog ? isSameDay(lastLog.observed_at) : false;

  /* ─── Get latest value for a WQ param ─── */

  function getLatestValue(paramKey: keyof PondLog): number | null {
    for (const log of logs) {
      const val = log[paramKey];
      if (val != null && typeof val === 'number') return val;
    }
    return null;
  }

  /* ─── Close cycle handler ─── */

  function handleCloseCycle() {
    Alert.alert(
      'Close Cycle',
      'Are you sure you want to close the active cycle? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Cycle',
          style: 'destructive',
          onPress: async () => {
            if (!activeCycle) return;
            try {
              const raw = await AsyncStorage.getItem(STORAGE_KEYS.CYCLES);
              const cycles: CropCycle[] = raw ? JSON.parse(raw) : [];
              const updated = cycles.map((c) =>
                c._id === activeCycle._id
                  ? { ...c, status: 'closed' as const, closed_at: new Date().toISOString() }
                  : c
              );
              await AsyncStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(updated));
              loadData();
            } catch {
              Alert.alert('Error', 'Failed to close cycle. Please try again.');
            }
          },
        },
      ]
    );
  }

  /* ─── FCR color ─── */

  function fcrColor(fcr: number): string {
    if (fcr <= 1.4) return COLORS.green;
    if (fcr <= 1.8) return COLORS.amber;
    return COLORS.red;
  }

  /* ─── Render: Water Quality Grid ─── */

  function renderWQGrid() {
    const tileWidth = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm) / 2;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Water Quality</Text>
        <View style={styles.wqGrid}>
          {WQ_TILES.map((tile) => {
            const val = getLatestValue(tile.key);
            const status: TileStatus = val != null ? tile.getStatus(val) : 'gray';
            const bg = TILE_BG[status];
            const dot = TILE_DOT[status];
            const textColor = TILE_TEXT[status];

            const displayVal =
              val != null
                ? val % 1 === 0
                  ? val.toString()
                  : val.toFixed(2)
                : '\u2014';

            return (
              <View
                key={tile.key}
                style={[styles.wqTile, { width: tileWidth, backgroundColor: bg }]}
              >
                <View style={styles.wqTileTop}>
                  <Text style={styles.wqLabel}>{tile.label}</Text>
                  <View
                    style={[styles.wqDot, { backgroundColor: dot }]}
                  />
                </View>
                <Text style={[styles.wqValue, { color: textColor }]}>
                  {displayVal}
                </Text>
                {tile.unit ? (
                  <Text style={styles.wqUnit}>{tile.unit}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  /* ─── Render: Biomass & Growth Card ─── */

  function renderBiomassCard() {
    if (!metrics) return null;

    const metricCells: Array<{
      label: string;
      value: string;
      color?: string;
      dim?: boolean;
    }> = [
      {
        label: 'ABW (g)',
        value: metrics.abwG != null ? metrics.abwG.toFixed(1) : '\u2014',
        dim: metrics.abwStale,
      },
      {
        label: 'Biomass (kg)',
        value: metrics.biomassKg != null ? metrics.biomassKg.toFixed(1) : '\u2014',
      },
      {
        label: 'Survival %',
        value:
          metrics.survivalPct != null
            ? metrics.survivalPct.toFixed(1) + '%'
            : '\u2014',
        color:
          metrics.survivalPct != null
            ? metrics.survivalPct >= 80
              ? COLORS.green
              : metrics.survivalPct >= 60
              ? COLORS.amber
              : COLORS.red
            : undefined,
      },
      {
        label: 'FCR',
        value: metrics.fcr != null ? metrics.fcr.toFixed(2) : '\u2014',
        color: metrics.fcr != null ? fcrColor(metrics.fcr) : undefined,
      },
      {
        label: 'Feed (kg)',
        value: metrics.totalFeedKg.toFixed(1),
      },
      {
        label: 'Mortality',
        value: metrics.totalMortality.toLocaleString(),
        color: metrics.mortalityAlert ? COLORS.red : undefined,
      },
    ];

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Biomass & Growth</Text>
          {metrics.mortalityAlert && (
            <View style={styles.alertPill}>
              <Ionicons name="warning-outline" size={12} color={COLORS.red} />
              <Text style={styles.alertPillText}>High mortality today</Text>
            </View>
          )}
        </View>
        <View style={styles.biomassGrid}>
          {metricCells.map((cell) => (
            <View key={cell.label} style={styles.biomassCell}>
              <Text style={styles.bioLabel}>{cell.label}</Text>
              <Text
                style={[
                  styles.bioValue,
                  cell.dim && { color: COLORS.muted },
                  cell.color ? { color: cell.color } : {},
                ]}
              >
                {cell.value}
              </Text>
              {cell.dim && (
                <Text style={styles.staleNote}>7d+ old</Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  }

  /* ─── Render: Action Bar ─── */

  function renderActionBar() {
    return (
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => router.push(`/log/new?pondId=${pondId}`)}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={22} color={COLORS.white} />
          <Text style={styles.logBtnText}>Log Today</Text>
        </TouchableOpacity>

        <View style={styles.actionMeta}>
          <View
            style={[
              styles.lastLogPill,
              !loggedToday && { backgroundColor: '#fef6e4' },
            ]}
          >
            <Ionicons
              name={loggedToday ? 'checkmark-circle' : 'time-outline'}
              size={14}
              color={loggedToday ? COLORS.green : COLORS.amber}
            />
            <Text
              style={[
                styles.lastLogText,
                { color: loggedToday ? COLORS.green : COLORS.amber },
              ]}
            >
              {lastLog
                ? loggedToday
                  ? `Last logged: ${formatRelativeTime(lastLog.observed_at)}`
                  : `Last logged: ${formatRelativeTime(lastLog.observed_at)}`
                : 'No log yet'}
            </Text>
          </View>
          {!loggedToday && lastLog == null && (
            <Text style={styles.noLogToday}>No log today</Text>
          )}
          {!loggedToday && lastLog != null && (
            <Text style={[styles.noLogToday, { color: COLORS.amber }]}>
              No log today
            </Text>
          )}
        </View>

        {activeCycle && (
          <TouchableOpacity onPress={handleCloseCycle} style={styles.closeCycleLink}>
            <Text style={styles.closeCycleLinkText}>Close Cycle</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  /* ─── Render: Logs tab ─── */

  function renderLogsTab() {
    if (logs.length === 0) {
      return (
        <View style={styles.emptyTab}>
          <Ionicons name="document-text-outline" size={40} color={COLORS.muted} />
          <Text style={styles.emptyTabTitle}>No logs yet</Text>
          <Text style={styles.emptyTabSub}>
            Tap Log Today to start tracking your pond.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={logs}
        keyExtractor={(item) => item._id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.logSeparator} />}
        renderItem={({ item }) => <LogRow log={item} />}
      />
    );
  }

  /* ─── Render: Trends tab ─── */

  function renderTrendsTab() {
    if (logs.length < 2) {
      return (
        <View style={styles.emptyTab}>
          <Ionicons name="stats-chart-outline" size={40} color={COLORS.muted} />
          <Text style={styles.emptyTabTitle}>Not enough data</Text>
          <Text style={styles.emptyTabSub}>
            Log more readings to see trends.
          </Text>
        </View>
      );
    }

    const reversedLogs = [...logs].reverse();

    const trendParams: Array<{
      key: keyof PondLog;
      label: string;
      unit: string;
      color: string;
    }> = [
      { key: 'do_mgl', label: 'DO', unit: 'mg/L', color: COLORS.primary },
      { key: 'ph', label: 'pH', unit: '', color: COLORS.green },
      { key: 'temp_c', label: 'Temp', unit: '°C', color: COLORS.amber },
      { key: 'salinity_ppt', label: 'Salinity', unit: 'ppt', color: '#9b59b6' },
      { key: 'ammonia_mgl', label: 'NH\u2083', unit: 'mg/L', color: COLORS.red },
      { key: 'calcium_mgl', label: 'Ca', unit: 'mg/L', color: '#1abc9c' },
      { key: 'magnesium_mgl', label: 'Mg', unit: 'mg/L', color: '#e67e22' },
      { key: 'potassium_mgl', label: 'K', unit: 'mg/L', color: '#8e44ad' },
    ];

    const panels: JSX.Element[] = [];

    for (const tp of trendParams) {
      const vals = reversedLogs
        .map((l) => l[tp.key] as number | null | undefined)
        .filter((v): v is number => v != null);

      if (vals.length < 2) continue;

      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;

      panels.push(
        <View key={tp.key} style={styles.trendPanel}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendLabel}>
              {tp.label}
              {tp.unit ? ` (${tp.unit})` : ''}
            </Text>
            <Text style={styles.trendCount}>{vals.length} readings</Text>
          </View>
          <Sparkline values={vals} color={tp.color} />
          <View style={styles.trendStats}>
            <TrendStat label="Min" value={min.toFixed(2)} />
            <TrendStat label="Avg" value={avg.toFixed(2)} />
            <TrendStat label="Max" value={max.toFixed(2)} />
          </View>
        </View>
      );
    }

    if (panels.length === 0) {
      return (
        <View style={styles.emptyTab}>
          <Ionicons name="stats-chart-outline" size={40} color={COLORS.muted} />
          <Text style={styles.emptyTabTitle}>No parameter data</Text>
          <Text style={styles.emptyTabSub}>
            Log water quality readings to see trends.
          </Text>
        </View>
      );
    }

    return <View style={styles.trendsContainer}>{panels}</View>;
  }

  /* ─── Render: Cycles tab ─── */

  function renderCyclesTab() {
    if (allCycles.length === 0) {
      return (
        <View style={styles.emptyTab}>
          <Ionicons name="refresh-circle-outline" size={40} color={COLORS.muted} />
          <Text style={styles.emptyTabTitle}>No cycles yet</Text>
          <Text style={styles.emptyTabSub}>
            Start a new cycle from the pond setup screen.
          </Text>
        </View>
      );
    }

    return (
      <View>
        {allCycles
          .slice()
          .sort(
            (a, b) =>
              new Date(b.stocking_date).getTime() -
              new Date(a.stocking_date).getTime()
          )
          .map((cycle) => {
            const isActive = cycle.status === 'active';
            const stockDate = new Date(cycle.stocking_date).toLocaleDateString(
              'en-IN',
              { day: '2-digit', month: 'short', year: 'numeric' }
            );

            return (
              <TouchableOpacity
                key={cycle._id}
                style={styles.cycleRow}
                activeOpacity={isActive ? 1 : 0.7}
                onPress={() => {
                  if (isActive) return;
                  Alert.alert(
                    getSpeciesLabel(cycle.species),
                    [
                      `Stocked: ${stockDate}`,
                      cycle.fcr != null ? `FCR: ${cycle.fcr.toFixed(2)}` : null,
                      cycle.survival_rate != null
                        ? `Survival: ${cycle.survival_rate.toFixed(1)}%`
                        : null,
                      cycle.harvest_weight_kg != null
                        ? `Harvest: ${cycle.harvest_weight_kg} kg`
                        : null,
                      cycle.outcome ? `Outcome: ${cycle.outcome}` : null,
                    ]
                      .filter(Boolean)
                      .join('\n'),
                    [{ text: 'OK' }]
                  );
                }}
              >
                <View style={styles.cycleRowLeft}>
                  <Text style={styles.cycleSpecies}>
                    {getSpeciesLabel(cycle.species)}
                  </Text>
                  <Text style={styles.cycleDate}>Stocked {stockDate}</Text>
                </View>
                <View style={styles.cycleRowRight}>
                  <Badge
                    label={isActive ? 'Active' : 'Closed'}
                    color={isActive ? 'green' : 'gray'}
                  />
                  {!isActive && cycle.fcr != null && (
                    <Text style={styles.cycleFcr}>
                      FCR {cycle.fcr.toFixed(2)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
      </View>
    );
  }

  /* ─── Main render ─── */

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <Header
        title={pond.name}
        onBack={() => router.back()}
        rightAction={{
          icon: 'refresh-outline',
          onPress: loadData,
          accessibilityLabel: 'Refresh',
        }}
      />

      {/* Zone 1: Cycle Identity Strip */}
      {activeCycle ? (
        <View style={styles.cycleStrip}>
          <View style={styles.cycleStripLeft}>
            <Text style={styles.cycleSpeciesText} numberOfLines={1}>
              {speciesLabel}
            </Text>
            {harvestInfo && (
              <Text style={[styles.harvestText, { color: harvestInfo.color }]}>
                {harvestInfo.text}
              </Text>
            )}
          </View>
          <View style={styles.cycleStripRight}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>
                Day {dayNumber}
              </Text>
            </View>
            <Badge label="Active" color="green" />
          </View>
        </View>
      ) : (
        <View style={[styles.cycleStrip, { backgroundColor: '#4a5568' }]}>
          <Text style={styles.cycleSpeciesText}>No active cycle</Text>
          <Badge label="Closed" color="gray" />
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Zone 2: Water Quality Grid */}
        {renderWQGrid()}

        {/* Zone 3: Biomass & Growth */}
        {renderBiomassCard()}

        {/* Zone 4: Action Bar */}
        {renderActionBar()}

        {/* Zone 5: Tabs */}
        <View style={styles.tabsContainer}>
          {/* Tab headers */}
          <View style={styles.tabBar}>
            {(['Logs', 'Trends', 'Cycles'] as TabName[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    activeTab === tab && styles.tabBtnTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          <View style={styles.tabContent}>
            {activeTab === 'Logs' && renderLogsTab()}
            {activeTab === 'Trends' && (
              <ScrollView scrollEnabled={false}>
                {renderTrendsTab()}
              </ScrollView>
            )}
            {activeTab === 'Cycles' && renderCyclesTab()}
          </View>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── LogRow sub-component ─── */

interface LogRowProps {
  log: PondLog;
}

function LogRow({ log }: LogRowProps) {
  const chips: Array<{ label: string; status: TileStatus }> = [];

  if (log.do_mgl != null) {
    const s = WQ_TILES[0].getStatus(log.do_mgl);
    chips.push({ label: `DO ${log.do_mgl.toFixed(1)}`, status: s });
  }
  if (log.ph != null) {
    const s = WQ_TILES[1].getStatus(log.ph);
    chips.push({ label: `pH ${log.ph.toFixed(1)}`, status: s });
  }
  if (log.temp_c != null) {
    const s = WQ_TILES[2].getStatus(log.temp_c);
    chips.push({ label: `${log.temp_c.toFixed(1)}°C`, status: s });
  }

  return (
    <TouchableOpacity
      style={styles.logRow}
      onPress={() =>
        Alert.alert(
          'Log Entry',
          'Edit functionality coming soon.',
          [{ text: 'OK' }]
        )
      }
      activeOpacity={0.7}
    >
      <View style={styles.logRowLeft}>
        <Text style={styles.logDateTime}>{formatLogDate(log.observed_at)}</Text>
        {log.notes ? (
          <Text style={styles.logNotes} numberOfLines={1}>
            {log.notes}
          </Text>
        ) : null}
      </View>
      <View style={styles.logChips}>
        {chips.map((chip) => (
          <View
            key={chip.label}
            style={[
              styles.logChip,
              { backgroundColor: TILE_BG[chip.status] },
            ]}
          >
            <StatusDot color={chip.status === 'gray' ? 'gray' : chip.status} size={6} />
            <Text style={[styles.logChipText, { color: TILE_TEXT[chip.status] }]}>
              {chip.label}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

/* ─── TrendStat sub-component ─── */

function TrendStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.trendStat}>
      <Text style={styles.trendStatLabel}>{label}</Text>
      <Text style={styles.trendStatValue}>{value}</Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.grayBg,
  },

  /* Not found */
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  notFoundText: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  notFoundSub: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },

  /* ── Zone 1: Cycle Strip ── */
  cycleStrip: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  cycleStripLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  cycleStripRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cycleSpeciesText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.white,
  },
  harvestText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.medium,
    marginTop: 2,
  },
  dayBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  dayBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },

  /* ── Scroll ── */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },

  /* ── Shared section shell ── */
  section: {
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
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  alertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdecea',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    gap: 4,
  },
  alertPillText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.red,
    fontWeight: FONTS.weights.medium,
  },

  /* ── Zone 2: WQ Grid ── */
  wqGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  wqTile: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minHeight: 76,
    justifyContent: 'flex-end',
  },
  wqTileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  wqLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.medium,
    color: COLORS.muted,
  },
  wqDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  wqValue: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    lineHeight: 28,
  },
  wqUnit: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.muted,
    marginTop: 1,
  },

  /* ── Zone 3: Biomass Grid ── */
  biomassGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  biomassCell: {
    width: '33.33%',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  bioLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.muted,
    fontWeight: FONTS.weights.medium,
    textAlign: 'center',
    marginBottom: 2,
  },
  bioValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    textAlign: 'center',
  },
  staleNote: {
    fontSize: FONTS.sizes.xs - 1,
    color: COLORS.muted,
    marginTop: 1,
  },

  /* ── Zone 4: Action Bar ── */
  actionBar: {
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
    gap: SPACING.md,
  },
  logBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logBtnText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
  },
  actionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  lastLogPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f9f0',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: 4,
    flexShrink: 1,
  },
  lastLogText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
  },
  noLogToday: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.amber,
    fontWeight: FONTS.weights.medium,
  },
  closeCycleLink: {
    alignSelf: 'center',
    paddingVertical: SPACING.xs,
  },
  closeCycleLinkText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    fontWeight: FONTS.weights.medium,
    textDecorationLine: 'underline',
  },

  /* ── Zone 5: Tabs ── */
  tabsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabBtnText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    color: COLORS.muted,
  },
  tabBtnTextActive: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold,
  },
  tabContent: {
    padding: SPACING.lg,
  },

  /* ── Logs tab ── */
  emptyTab: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyTabTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  emptyTabSub: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.muted,
    textAlign: 'center',
  },
  logSeparator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  logRowLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  logDateTime: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
  },
  logNotes: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.muted,
    marginTop: 2,
  },
  logChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'flex-end',
  },
  logChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    gap: 3,
  },
  logChipText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.medium,
  },

  /* ── Trends tab ── */
  trendsContainer: {
    gap: SPACING.lg,
  },
  trendPanel: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.grayBg,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  trendLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  trendCount: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.muted,
  },
  trendStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  trendStat: {
    alignItems: 'center',
  },
  trendStatLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.muted,
    fontWeight: FONTS.weights.medium,
  },
  trendStatValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginTop: 2,
  },

  /* ── Cycles tab ── */
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cycleRowLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  cycleSpecies: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  cycleDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.muted,
    marginTop: 2,
  },
  cycleRowRight: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  cycleFcr: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.muted,
    fontWeight: FONTS.weights.medium,
  },
});

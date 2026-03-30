import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS, FONTS, SPACING, RADIUS } from '../../src/lib/theme';
import type { User, PondLog, InventoryItem } from '../../src/lib/types';

/* ─── Helpers ─── */

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  te: 'Telugu',
  hi: 'Hindi',
};

/* ─── Section Card ─── */

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>;
}

/* ─── Screen ─── */

export default function SettingsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const loadUser = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('aquaprana_user');
      setUser(raw ? JSON.parse(raw) : null);
    } catch (e) {
      console.error('Settings load user error', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser])
  );

  /* ─── Export Water Quality CSV ─── */
  async function handleExportLogs() {
    try {
      const raw = await AsyncStorage.getItem('aquaprana_logs');
      const logs: PondLog[] = raw ? JSON.parse(raw) : [];

      if (logs.length === 0) {
        Alert.alert('No Data', 'No water quality logs found to export.');
        return;
      }

      const headers = [
        'id',
        'pond_id',
        'cycle_id',
        'observed_at',
        'do_mgl',
        'ph',
        'temp_c',
        'salinity_ppt',
        'ammonia_mgl',
        'turbidity_cm',
        'feed_qty_kg',
        'mortality_count',
        'biomass_kg',
        'abw_g',
        'notes',
      ].join(',');

      const rows = logs.map((l) =>
        [
          l._id,
          l.pond_id,
          l.cycle_id,
          l.observed_at,
          l.do_mgl ?? '',
          l.ph ?? '',
          l.temp_c ?? '',
          l.salinity_ppt ?? '',
          l.ammonia_mgl ?? '',
          l.turbidity_cm ?? '',
          l.feed_qty_kg ?? '',
          l.mortality_count ?? '',
          l.biomass_kg ?? '',
          l.abw_g ?? '',
          (l.notes ?? '').replace(/,/g, ' '),
        ].join(',')
      );

      const csv = [headers, ...rows].join('\n');
      const preview = [headers, ...rows.slice(0, 3)].join('\n');

      Alert.alert(
        `Water Quality CSV (${logs.length} records)`,
        `Preview (first 3 rows):\n\n${preview}\n\n(Use expo-sharing to save the full file)`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      console.error('Export logs error', e);
      Alert.alert('Error', 'Failed to export water quality data.');
    }
  }

  /* ─── Export Inventory CSV ─── */
  async function handleExportInventory() {
    try {
      const raw = await AsyncStorage.getItem('aquaprana_inventory');
      const items: InventoryItem[] = raw ? JSON.parse(raw) : [];

      if (items.length === 0) {
        Alert.alert('No Data', 'No inventory items found to export.');
        return;
      }

      const headers = [
        'id',
        'product_name',
        'unit',
        'current_qty',
        'restock_threshold',
        'restock_qty',
        'location',
        'created_at',
        'updated_at',
      ].join(',');

      const rows = items.map((i) =>
        [
          i._id,
          `"${i.product_name}"`,
          i.unit,
          i.current_qty,
          i.restock_threshold,
          i.restock_qty ?? '',
          i.location ?? '',
          i.created_at,
          i.updated_at,
        ].join(',')
      );

      const csv = [headers, ...rows].join('\n');
      const preview = [headers, ...rows.slice(0, 3)].join('\n');

      Alert.alert(
        `Inventory CSV (${items.length} records)`,
        `Preview (first 3 rows):\n\n${preview}\n\n(Use expo-sharing to save the full file)`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      console.error('Export inventory error', e);
      Alert.alert('Error', 'Failed to export inventory data.');
    }
  }

  /* ─── Sign Out ─── */
  function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your local data will remain on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all([
                AsyncStorage.removeItem('aquaprana_user'),
                AsyncStorage.removeItem('aquaprana_token'),
                AsyncStorage.removeItem('aquaprana_phone'),
              ]);
              router.replace('/');
            } catch (e) {
              console.error('Sign out error', e);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.grayBg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Profile Card ── */}
        <SectionCard>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user ? getInitials(user.name) : '??'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.name ?? 'Guest User'}
              </Text>
              <Text style={styles.profileMeta} numberOfLines={1}>
                {user?.phone ?? '—'}
              </Text>
              {user && (
                <Text style={styles.profileMeta} numberOfLines={1}>
                  {user.district}, {user.state}
                </Text>
              )}
            </View>
            {user?.language && (
              <View style={styles.langBadge}>
                <Text style={styles.langBadgeText}>
                  {LANGUAGE_LABELS[user.language] ?? user.language}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => router.push('/auth/profile')}
          >
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ── Price Configuration ── */}
        <SectionCard>
          <Text style={styles.sectionTitle}>Price Configuration</Text>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() =>
              Alert.alert(
                'Price Configuration',
                'Set up price config from a pond\'s expense screen.'
              )
            }
          >
            <View style={styles.menuRowLeft}>
              <Ionicons name="pricetag-outline" size={20} color={COLORS.primary} />
              <Text style={styles.menuRowText}>Feed, seed & treatment prices</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        </SectionCard>

        {/* ── Data Export ── */}
        <SectionCard>
          <Text style={styles.sectionTitle}>Data Export</Text>

          <TouchableOpacity style={styles.menuRow} onPress={handleExportLogs}>
            <View style={styles.menuRowLeft}>
              <Ionicons name="water-outline" size={20} color={COLORS.primary} />
              <Text style={styles.menuRowText}>Export Water Quality CSV</Text>
            </View>
            <Ionicons name="download-outline" size={18} color={COLORS.muted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuRow} onPress={handleExportInventory}>
            <View style={styles.menuRowLeft}>
              <Ionicons name="cube-outline" size={20} color={COLORS.primary} />
              <Text style={styles.menuRowText}>Export Inventory CSV</Text>
            </View>
            <Ionicons name="download-outline" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        </SectionCard>

        {/* ── About ── */}
        <SectionCard>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutAppName}>AquaPrana</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>v0.2</Text>
            </View>
          </View>
          <Text style={styles.aboutCompany}>AQUA AI Pvt Ltd</Text>
          <Text style={styles.aboutCopyright}>© 2026 All rights reserved</Text>
        </SectionCard>

        {/* ── Sign Out ── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.red} />
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.grayBg,
  },
  header: {
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
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 48,
    gap: SPACING.md,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  profileMeta: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.muted,
  },
  langBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  langBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
  },
  editProfileBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  editProfileBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  menuRowText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    flex: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  aboutAppName: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  versionBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  versionBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
  },
  aboutCompany: {
    fontSize: FONTS.sizes.md,
    color: COLORS.muted,
  },
  aboutCopyright: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.muted,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.red,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    minHeight: 52,
    marginTop: SPACING.sm,
  },
  signOutBtnText: {
    color: COLORS.red,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
  },
});

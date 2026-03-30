import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Modal,
  FlatList,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { COLORS, FONTS, SPACING, RADIUS } from '../../src/lib/theme';
import { SPECIES_LIST, HARVEST_WINDOWS } from '../../src/lib/types';
import type { Pond, CropCycle } from '../../src/lib/types';

/* ─── helpers ─── */

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function calcHarvestWindow(
  speciesKey: string,
  stockingDate: Date
): { start: Date; end: Date } | null {
  const hw = HARVEST_WINDOWS[speciesKey];
  if (!hw) return null;
  return {
    start: addDays(stockingDate, hw.min),
    end: addDays(stockingDate, hw.max),
  };
}

/* ─── Species Picker Modal ─── */

interface SpeciesModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (key: string, label: string) => void;
}

function SpeciesModal({ visible, onClose, onSelect }: SpeciesModalProps) {
  const groupHeaderMap: Record<string, string> = {
    Shrimp: 'Shrimp',
    'Fish Freshwater': 'Fish — Freshwater',
    'Fish Brackish/Marine': 'Fish — Brackish/Marine',
    Crab: 'Crab',
    Mollusc: 'Mollusc',
    Seaweed: 'Seaweed',
    Other: 'Other',
  };

  type ListItem =
    | { type: 'header'; title: string }
    | { type: 'item'; key: string; label: string };

  const listData: ListItem[] = [];
  SPECIES_LIST.forEach((group) => {
    listData.push({
      type: 'header',
      title: groupHeaderMap[group.group] ?? group.group,
    });
    group.species.forEach((s) => {
      listData.push({ type: 'item', key: s.key, label: s.label });
    });
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Select Species</Text>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={listData}
          keyExtractor={(item, idx) =>
            item.type === 'header' ? `h-${idx}` : item.key
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={modalStyles.groupHeader}>
                  <Text style={modalStyles.groupHeaderText}>{item.title}</Text>
                </View>
              );
            }
            return (
              <TouchableOpacity
                style={modalStyles.speciesRow}
                onPress={() => {
                  onSelect(item.key, item.label);
                  onClose();
                }}
              >
                <Text style={modalStyles.speciesText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  closeBtn: { padding: SPACING.xs },
  groupHeader: {
    backgroundColor: COLORS.grayBg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groupHeaderText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  speciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  speciesText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
});

/* ─── Main Setup Screen ─── */

export default function PondSetupScreen() {
  const router = useRouter();

  // Pond Details
  const [pondName, setPondName] = useState('');
  const [areaAcres, setAreaAcres] = useState('');
  const [depthFt, setDepthFt] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Cycle Details
  const [speciesKey, setSpeciesKey] = useState('');
  const [speciesLabel, setSpeciesLabel] = useState('');
  const [stockingDensity, setStockingDensity] = useState('');
  const [stockingDate, setStockingDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');

  const [showSpeciesModal, setShowSpeciesModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Harvest window
  const harvestWindow =
    speciesKey && stockingDate ? calcHarvestWindow(speciesKey, stockingDate) : null;
  const harvestWindowText = harvestWindow
    ? `Ready from ${formatDate(harvestWindow.start)} to ${formatDate(harvestWindow.end)}`
    : '—';

  const captureGPS = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to capture GPS.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({
        lat: parseFloat(pos.coords.latitude.toFixed(6)),
        lng: parseFloat(pos.coords.longitude.toFixed(6)),
      });
    } catch (e) {
      Alert.alert('GPS Error', 'Could not get location. Please try again.');
    } finally {
      setGpsLoading(false);
    }
  };

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setStockingDate(selected);
  };

  const validate = (): string | null => {
    if (!pondName.trim()) return 'Pond name is required.';
    if (pondName.trim().length > 60) return 'Pond name must be 60 characters or less.';
    if (!speciesKey) return 'Please select a species.';
    if (!stockingDensity || isNaN(Number(stockingDensity)) || Number(stockingDensity) <= 0)
      return 'Stocking density must be a positive number.';
    if (!stockingDate) return 'Please select a stocking date.';
    return null;
  };

  const handleCreate = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Validation Error', err);
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const pondId = `pond_${Date.now()}`;
      const cycleId = `cycle_${Date.now() + 1}`;

      const hw = calcHarvestWindow(speciesKey, stockingDate!);

      const newPond: Pond = {
        _id: pondId,
        user_id: 'local',
        name: pondName.trim(),
        area_acres: areaAcres ? parseFloat(areaAcres) : undefined,
        depth_ft: depthFt ? parseFloat(depthFt) : undefined,
        location: location ?? undefined,
        is_active: true,
        created_at: now,
        updated_at: now,
      };

      const newCycle: CropCycle = {
        _id: cycleId,
        pond_id: pondId,
        species: speciesKey,
        stocking_density: parseFloat(stockingDensity),
        stocking_date: stockingDate!.toISOString(),
        harvest_window_start: hw?.start.toISOString(),
        harvest_window_end: hw?.end.toISOString(),
        status: 'active',
        notes: notes.trim() || null,
        created_at: now,
      };

      // Load existing and append
      const [pondsRaw, cyclesRaw] = await Promise.all([
        AsyncStorage.getItem('aquaprana_ponds'),
        AsyncStorage.getItem('aquaprana_cycles'),
      ]);
      const existingPonds: Pond[] = pondsRaw ? JSON.parse(pondsRaw) : [];
      const existingCycles: CropCycle[] = cyclesRaw ? JSON.parse(cyclesRaw) : [];

      await Promise.all([
        AsyncStorage.setItem(
          'aquaprana_ponds',
          JSON.stringify([...existingPonds, newPond])
        ),
        AsyncStorage.setItem(
          'aquaprana_cycles',
          JSON.stringify([...existingCycles, newCycle])
        ),
      ]);

      router.replace(`/pond/${pondId}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to save pond. Please try again.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Pond</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pond Details</Text>

            <View style={styles.field}>
              <Text style={styles.label}>
                Pond Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. North Pond 1"
                placeholderTextColor={COLORS.muted}
                value={pondName}
                onChangeText={setPondName}
                maxLength={60}
                returnKeyType="next"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Area (acres)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor={COLORS.muted}
                  value={areaAcres}
                  onChangeText={setAreaAcres}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>
              <View style={{ width: SPACING.md }} />
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Depth (ft)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor={COLORS.muted}
                  value={depthFt}
                  onChangeText={setDepthFt}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Location (GPS)</Text>
              <TouchableOpacity
                style={styles.gpsBtn}
                onPress={captureGPS}
                disabled={gpsLoading}
              >
                {gpsLoading ? (
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={location ? COLORS.green : COLORS.primary}
                  />
                )}
                <Text
                  style={[
                    styles.gpsBtnText,
                    { color: location ? COLORS.green : COLORS.primary },
                  ]}
                >
                  {location
                    ? `${location.lat}, ${location.lng}`
                    : 'Tap to capture GPS'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 2 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cycle Details</Text>

            <View style={styles.field}>
              <Text style={styles.label}>
                Species <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.selectBtn}
                onPress={() => setShowSpeciesModal(true)}
              >
                <Text
                  style={[
                    styles.selectBtnText,
                    { color: speciesKey ? COLORS.text : COLORS.muted },
                  ]}
                >
                  {speciesLabel || 'Select species…'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Stocking Density (per m²) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 20"
                placeholderTextColor={COLORS.muted}
                value={stockingDensity}
                onChangeText={setStockingDensity}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Stocking Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.selectBtn}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                <Text
                  style={[
                    styles.selectBtnText,
                    { color: stockingDate ? COLORS.text : COLORS.muted },
                  ]}
                >
                  {stockingDate ? formatDate(stockingDate) : 'Select date…'}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={stockingDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}
            {Platform.OS === 'ios' && showDatePicker && (
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Harvest Window</Text>
              <View style={styles.harvestBox}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={harvestWindow ? COLORS.green : COLORS.muted}
                />
                <Text
                  style={[
                    styles.harvestText,
                    { color: harvestWindow ? COLORS.text : COLORS.muted },
                  ]}
                >
                  {harvestWindowText}
                </Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Any additional notes about this cycle…"
                placeholderTextColor={COLORS.muted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.createBtn, saving && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
                <Text style={styles.createBtnText}>Create Pond & Start Cycle</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <SpeciesModal
        visible={showSpeciesModal}
        onClose={() => setShowSpeciesModal(false)}
        onSelect={(key, label) => {
          setSpeciesKey(key);
          setSpeciesLabel(label);
        }}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 48,
    gap: SPACING.lg,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
  },
  field: {
    gap: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    color: COLORS.text,
  },
  required: {
    color: COLORS.red,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  textarea: {
    minHeight: 88,
    paddingTop: SPACING.sm + 2,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  selectBtnText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  gpsBtnText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
  },
  harvestBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.grayBg,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  harvestText: {
    fontSize: FONTS.sizes.sm,
  },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  doneBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  createBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md + 2,
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
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
  },
});

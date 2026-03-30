/* ─── Core Entity Types ─── */

export interface User {
  _id: string;
  phone: string;
  name: string;
  state: string;
  district: string;
  language: 'en' | 'te' | 'hi';
  created_at: string;
}

export interface Pond {
  _id: string;
  user_id: string;
  name: string;
  area_acres?: number;
  depth_ft?: number;
  location?: { lat: number; lng: number };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CropCycle {
  _id: string;
  pond_id: string;
  species: string;
  stocking_density: number;
  stocking_date: string;
  harvest_window_start?: string;
  harvest_window_end?: string;
  outcome?: 'Successful' | 'Failed';
  harvest_weight_kg?: number | null;
  actual_harvest_date?: string | null;
  fcr?: number | null;
  survival_rate?: number | null;
  status: 'active' | 'closed';
  notes?: string | null;
  created_at: string;
  closed_at?: string | null;
}

export interface PondLog {
  _id: string;
  cycle_id: string;
  pond_id: string;
  observed_at: string;
  do_mgl?: number | null;
  ph?: number | null;
  temp_c?: number | null;
  salinity_ppt?: number | null;
  ammonia_mgl?: number | null;
  turbidity_cm?: number | null;
  calcium_mgl?: number | null;
  magnesium_mgl?: number | null;
  potassium_mgl?: number | null;
  param_source: 'manual' | 'iot';
  feed_qty_kg?: number | null;
  feed_brand?: string | null;
  mortality_count?: number | null;
  treatment?: string | null;
  abw_g?: number | null;
  biomass_kg?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedTime {
  time: string;
  qty_kg: number;
}

export interface FeedingSchedule {
  _id: string;
  cycle_id: string;
  pond_id: string;
  feeds_per_day: number;
  feed_times: FeedTime[];
  interval_rule: 'fixed' | 'pct_biomass';
  feed_rate_pct: number | null;
  default_brand: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreatmentPrice {
  name: string;
  unit: string;
  price: number;
}

export interface PriceConfig {
  _id: string;
  user_id: string;
  feed_price_per_kg: number;
  seed_price_per_1000: number;
  labour_cost_per_day: number;
  treatment_prices: TreatmentPrice[];
  created_at: string;
  updated_at: string;
}

export interface CycleExpense {
  _id: string;
  cycle_id: string;
  feed_cost: number;
  seed_cost: number;
  treatment_cost: number;
  labour_cost: number;
  total_cost: number;
  cost_per_kg: number;
  computed_at: string;
}

export interface InventoryItem {
  _id: string;
  user_id: string;
  product_name: string;
  unit: 'kg' | 'litre' | 'units' | 'bags';
  current_qty: number;
  restock_threshold: number;
  restock_qty: number;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryOrder {
  _id: string;
  item_id: string;
  user_id: string;
  quantity: number;
  status: 'pending' | 'fulfilled';
  requested_at: string;
  fulfilled_at: string | null;
}

/* ─── Water Quality ─── */

export type WaterQualityParam =
  | 'do_mgl'
  | 'ph'
  | 'temp_c'
  | 'salinity_ppt'
  | 'ammonia_mgl'
  | 'turbidity_cm'
  | 'calcium_mgl'
  | 'magnesium_mgl'
  | 'potassium_mgl';

export interface QualityRange {
  safe: [number, number];
  warning: [number, number];
  critical: [number, number];
  unit: string;
  label: string;
}

export const WATER_QUALITY_RANGES: Record<WaterQualityParam, QualityRange> = {
  do_mgl: {
    safe: [5, 12],
    warning: [3, 5],
    critical: [0, 3],
    unit: 'mg/L',
    label: 'Dissolved Oxygen',
  },
  ph: {
    safe: [7.0, 8.5],
    warning: [6.5, 7.0],
    critical: [0, 6.5],
    unit: '',
    label: 'pH',
  },
  temp_c: {
    safe: [26, 32],
    warning: [22, 26],
    critical: [0, 22],
    unit: '°C',
    label: 'Temperature',
  },
  salinity_ppt: {
    safe: [10, 25],
    warning: [5, 10],
    critical: [0, 5],
    unit: 'ppt',
    label: 'Salinity',
  },
  ammonia_mgl: {
    safe: [0, 0.1],
    warning: [0.1, 0.5],
    critical: [0.5, 10],
    unit: 'mg/L',
    label: 'Ammonia',
  },
  turbidity_cm: {
    safe: [30, 45],
    warning: [20, 30],
    critical: [0, 20],
    unit: 'cm',
    label: 'Turbidity (Secchi)',
  },
  calcium_mgl: {
    safe: [100, 300],
    warning: [50, 100],
    critical: [0, 50],
    unit: 'mg/L',
    label: 'Calcium',
  },
  magnesium_mgl: {
    safe: [300, 1500],
    warning: [150, 300],
    critical: [0, 150],
    unit: 'mg/L',
    label: 'Magnesium',
  },
  potassium_mgl: {
    safe: [50, 200],
    warning: [25, 50],
    critical: [0, 25],
    unit: 'mg/L',
    label: 'Potassium',
  },
};

/* ─── Species List ─── */

export interface SpeciesGroup {
  group: string;
  species: { key: string; label: string }[];
}

export const SPECIES_LIST: SpeciesGroup[] = [
  {
    group: 'Shrimp',
    species: [
      { key: 'vannamei', label: 'Vannamei (Pacific White Shrimp)' },
      { key: 'monodon', label: 'Tiger Prawn (Black Tiger Shrimp)' },
      { key: 'indian_white', label: 'Indian White Shrimp' },
      { key: 'banana_prawn', label: 'Banana Prawn' },
      { key: 'rosenbergii', label: 'Golda Prawn (Giant Freshwater Prawn)' },
      { key: 'river_scampi', label: 'River Scampi' },
    ],
  },
  {
    group: 'Fish Freshwater',
    species: [
      { key: 'rohu', label: 'Rohu' },
      { key: 'catla', label: 'Katla' },
      { key: 'mrigal', label: 'Mrigal' },
      { key: 'common_carp', label: 'Common Carp' },
      { key: 'grass_carp', label: 'Grass Carp' },
      { key: 'tilapia', label: 'Tilapia' },
      { key: 'pangasius', label: 'Basa (Pangasius)' },
      { key: 'murrel', label: 'Murrel (Snakehead)' },
      { key: 'magur', label: 'Magur (Walking Catfish)' },
      { key: 'singhi', label: 'Singhi (Stinging Catfish)' },
      { key: 'pearl_spot', label: 'Pearl Spot (Karimeen)' },
    ],
  },
  {
    group: 'Fish Brackish/Marine',
    species: [
      { key: 'seabass', label: 'Barramundi (Asian Seabass)' },
      { key: 'milkfish', label: 'Milkfish' },
      { key: 'pompano', label: 'Pompano' },
      { key: 'mullet', label: 'Mullet' },
      { key: 'grouper', label: 'Grouper' },
      { key: 'cobia', label: 'Cobia' },
      { key: 'red_snapper', label: 'Red Snapper' },
    ],
  },
  {
    group: 'Crab',
    species: [
      { key: 'mud_crab', label: 'Mud Crab' },
      { key: 'blue_crab', label: 'Blue Crab' },
    ],
  },
  {
    group: 'Mollusc',
    species: [
      { key: 'pacific_oyster', label: 'Pacific Oyster' },
      { key: 'oyster', label: 'Backwater Oyster' },
      { key: 'green_mussel', label: 'Green Mussel' },
      { key: 'pearl_mussel', label: 'Pearl Mussel' },
    ],
  },
  {
    group: 'Seaweed',
    species: [
      { key: 'kappaphycus', label: 'Cottonii (Kappaphycus)' },
      { key: 'gracilaria', label: 'Gracilaria' },
    ],
  },
  {
    group: 'Other',
    species: [{ key: 'other', label: 'Other / Custom Species' }],
  },
];

/* ─── Harvest Windows (days from stocking) ─── */

export interface HarvestWindow {
  min: number;
  max: number;
}

export const HARVEST_WINDOWS: Record<string, HarvestWindow> = {
  vannamei: { min: 90, max: 120 },
  monodon: { min: 120, max: 180 },
  indian_white: { min: 90, max: 130 },
  banana_prawn: { min: 90, max: 130 },
  rosenbergii: { min: 150, max: 240 },
  river_scampi: { min: 150, max: 240 },
  rohu: { min: 180, max: 270 },
  catla: { min: 180, max: 270 },
  mrigal: { min: 180, max: 270 },
  common_carp: { min: 150, max: 300 },
  grass_carp: { min: 150, max: 300 },
  tilapia: { min: 150, max: 210 },
  pangasius: { min: 150, max: 270 },
  murrel: { min: 180, max: 300 },
  magur: { min: 150, max: 240 },
  singhi: { min: 150, max: 240 },
  pearl_spot: { min: 180, max: 300 },
  seabass: { min: 270, max: 365 },
  milkfish: { min: 120, max: 240 },
  pompano: { min: 150, max: 270 },
  mullet: { min: 180, max: 365 },
  grouper: { min: 270, max: 450 },
  cobia: { min: 270, max: 450 },
  red_snapper: { min: 270, max: 365 },
  mud_crab: { min: 60, max: 90 },
  blue_crab: { min: 60, max: 120 },
  pacific_oyster: { min: 180, max: 365 },
  oyster: { min: 180, max: 365 },
  green_mussel: { min: 180, max: 270 },
  pearl_mussel: { min: 240, max: 365 },
  kappaphycus: { min: 45, max: 90 },
  gracilaria: { min: 45, max: 90 },
};

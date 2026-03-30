import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  User,
  Pond,
  CropCycle,
  PondLog,
  InventoryItem,
  InventoryOrder,
  FeedingSchedule,
  PriceConfig,
} from './types';

/* ─── Storage Keys ─── */
const KEYS = {
  USER: '@aquaprana/user',
  PONDS: '@aquaprana/ponds',
  CYCLES: '@aquaprana/cycles',
  LOGS: '@aquaprana/logs',
  INVENTORY: '@aquaprana/inventory',
  INVENTORY_ORDERS: '@aquaprana/inventory_orders',
  FEEDING_SCHEDULES: '@aquaprana/feeding_schedules',
  PRICE_CONFIGS: '@aquaprana/price_configs',
} as const;

/* ─── Generic helpers ─── */

async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silently ignore write errors
  }
}

/* ─── User ─── */

export async function getUser(): Promise<User | null> {
  return getItem<User>(KEYS.USER);
}

export async function saveUser(user: User): Promise<void> {
  return setItem(KEYS.USER, user);
}

/* ─── Ponds ─── */

export async function getPonds(): Promise<Pond[] | null> {
  return getItem<Pond[]>(KEYS.PONDS);
}

export async function savePonds(ponds: Pond[]): Promise<void> {
  return setItem(KEYS.PONDS, ponds);
}

/* ─── Crop Cycles ─── */

export async function getCycles(): Promise<CropCycle[] | null> {
  return getItem<CropCycle[]>(KEYS.CYCLES);
}

export async function saveCycles(cycles: CropCycle[]): Promise<void> {
  return setItem(KEYS.CYCLES, cycles);
}

/* ─── Pond Logs ─── */

export async function getLogs(): Promise<PondLog[] | null> {
  return getItem<PondLog[]>(KEYS.LOGS);
}

export async function saveLogs(logs: PondLog[]): Promise<void> {
  return setItem(KEYS.LOGS, logs);
}

/* ─── Inventory Items ─── */

export async function getInventory(): Promise<InventoryItem[] | null> {
  return getItem<InventoryItem[]>(KEYS.INVENTORY);
}

export async function saveInventory(items: InventoryItem[]): Promise<void> {
  return setItem(KEYS.INVENTORY, items);
}

/* ─── Inventory Orders ─── */

export async function getInventoryOrders(): Promise<InventoryOrder[] | null> {
  return getItem<InventoryOrder[]>(KEYS.INVENTORY_ORDERS);
}

export async function saveInventoryOrders(orders: InventoryOrder[]): Promise<void> {
  return setItem(KEYS.INVENTORY_ORDERS, orders);
}

/* ─── Feeding Schedules ─── */

export async function getFeedingSchedules(): Promise<FeedingSchedule[] | null> {
  return getItem<FeedingSchedule[]>(KEYS.FEEDING_SCHEDULES);
}

export async function saveFeedingSchedules(schedules: FeedingSchedule[]): Promise<void> {
  return setItem(KEYS.FEEDING_SCHEDULES, schedules);
}

/* ─── Price Configs ─── */

export async function getPriceConfigs(): Promise<PriceConfig[] | null> {
  return getItem<PriceConfig[]>(KEYS.PRICE_CONFIGS);
}

export async function savePriceConfigs(configs: PriceConfig[]): Promise<void> {
  return setItem(KEYS.PRICE_CONFIGS, configs);
}

import { create } from 'zustand';
import type { User, Pond, CropCycle, PondLog } from '../lib/types';
import {
  getUser,
  getPonds,
  getCycles,
  getLogs,
} from '../lib/storage';

/* ─── State Shape ─── */

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface AppState {
  user: User | null;
  ponds: Pond[];
  cycles: CropCycle[];
  logs: PondLog[];
  activePondId: string | null;
  activeCycleId: string | null;
  isOnline: boolean;
  syncStatus: SyncStatus;

  /* ─── User actions ─── */
  setUser: (user: User | null) => void;

  /* ─── Pond actions ─── */
  setPonds: (ponds: Pond[]) => void;
  addPond: (pond: Pond) => void;
  updatePond: (updated: Pond) => void;

  /* ─── Cycle actions ─── */
  setCycles: (cycles: CropCycle[]) => void;
  addCycle: (cycle: CropCycle) => void;
  updateCycle: (updated: CropCycle) => void;

  /* ─── Log actions ─── */
  setLogs: (logs: PondLog[]) => void;
  addLog: (log: PondLog) => void;
  updateLog: (updated: PondLog) => void;

  /* ─── Selection ─── */
  setActivePond: (id: string | null) => void;
  setActiveCycle: (id: string | null) => void;

  /* ─── Network / sync ─── */
  setOnline: (online: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;

  /* ─── Bootstrap ─── */
  loadAll: () => Promise<void>;
}

/* ─── Store ─── */

export const useAppStore = create<AppState>((set) => ({
  user: null,
  ponds: [],
  cycles: [],
  logs: [],
  activePondId: null,
  activeCycleId: null,
  isOnline: true,
  syncStatus: 'idle',

  /* ─── User ─── */
  setUser: (user) => set({ user }),

  /* ─── Ponds ─── */
  setPonds: (ponds) => set({ ponds }),

  addPond: (pond) =>
    set((state) => ({ ponds: [...state.ponds, pond] })),

  updatePond: (updated) =>
    set((state) => ({
      ponds: state.ponds.map((p) => (p._id === updated._id ? updated : p)),
    })),

  /* ─── Cycles ─── */
  setCycles: (cycles) => set({ cycles }),

  addCycle: (cycle) =>
    set((state) => ({ cycles: [...state.cycles, cycle] })),

  updateCycle: (updated) =>
    set((state) => ({
      cycles: state.cycles.map((c) => (c._id === updated._id ? updated : c)),
    })),

  /* ─── Logs ─── */
  setLogs: (logs) => set({ logs }),

  addLog: (log) =>
    set((state) => ({ logs: [...state.logs, log] })),

  updateLog: (updated) =>
    set((state) => ({
      logs: state.logs.map((l) => (l._id === updated._id ? updated : l)),
    })),

  /* ─── Selection ─── */
  setActivePond: (activePondId) => set({ activePondId }),
  setActiveCycle: (activeCycleId) => set({ activeCycleId }),

  /* ─── Network ─── */
  setOnline: (isOnline) => set({ isOnline }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),

  /* ─── Bootstrap: load everything from AsyncStorage ─── */
  loadAll: async () => {
    const [user, ponds, cycles, logs] = await Promise.all([
      getUser(),
      getPonds(),
      getCycles(),
      getLogs(),
    ]);

    set({
      user: user ?? null,
      ponds: ponds ?? [],
      cycles: cycles ?? [],
      logs: logs ?? [],
    });
  },
}));

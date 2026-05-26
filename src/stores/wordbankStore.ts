import { create } from 'zustand';
import { WordBank, loadBuiltinBanks, loadCachedBanks, saveBanksToCache, saveBankStates, loadBankStates, downloadBank as dlBank } from '../services/wordbank';
import { PALETTE } from '../utils/colors';

interface WordbankState {
  banks: WordBank[];
  loaded: boolean;

  loadBanks: () => Promise<void>;
  addDownloadedBank: (url: string) => Promise<void>;
  removeBank: (id: string) => void;
  toggleBank: (id: string) => void;
  setBankColor: (id: string, colorIdx: number) => void;
}

export const useWordbankStore = create<WordbankState>((set, get) => ({
  banks: [],
  loaded: false,

  loadBanks: async () => {
    // Load builtin + cached downloaded banks
    const [builtin, cached] = await Promise.all([
      loadBuiltinBanks(),
      loadCachedBanks(),
    ]);
    // Apply saved enabled/disabled states
    const states = loadBankStates();
    const withStates = [...builtin, ...cached].map(b => {
      if (b.id in states) {
        return { ...b, enabled: states[b.id] };
      }
      return b;
    });
    set({ banks: withStates, loaded: true });
  },

  addDownloadedBank: async (url: string) => {
    const bank = await dlBank(url);
    const banks = [...get().banks, bank];
    set({ banks });
    // Persist downloaded banks
    await saveBanksToCache(banks);
  },

  removeBank: (id: string) => {
    const banks = get().banks.filter(b => b.id !== id);
    set({ banks });
    saveBanksToCache(banks);
  },

  toggleBank: (id: string) => {
    const banks = get().banks.map(b =>
      b.id === id ? { ...b, enabled: !b.enabled } : b
    );
    set({ banks });
    // Persist enabled/disabled state for ALL banks
    saveBankStates(banks);
    if (banks.find(b => b.id === id && b.source === 'downloaded')) {
      saveBanksToCache(banks);
    }
  },

  setBankColor: (id: string, colorIdx: number) => {
    const color = PALETTE[colorIdx];
    const banks = get().banks.map(b =>
      b.id === id ? { ...b, color: color.value, bg: color.bg } : b
    );
    set({ banks });
    if (banks.find(b => b.id === id && b.source === 'downloaded')) {
      saveBanksToCache(banks);
    }
  },
}));

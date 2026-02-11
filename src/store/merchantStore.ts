import { create } from "zustand";
import { MerchantDisplay } from "../types/merchant";

interface MerchantState {
  merchants: MerchantDisplay[];
  selectedMerchant: MerchantDisplay | null;
  isLoading: boolean;
  error: string | null;
  setMerchants: (merchants: MerchantDisplay[]) => void;
  addMerchant: (merchant: MerchantDisplay) => void;
  setSelectedMerchant: (merchant: MerchantDisplay | null) => void;
  updateMerchant: (publicKey: string, updates: Partial<MerchantDisplay>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMerchantStore = create<MerchantState>((set) => ({
  merchants: [],
  selectedMerchant: null,
  isLoading: false,
  error: null,

  setMerchants: (merchants) => set({ merchants }),

  addMerchant: (merchant) =>
    set((state) => ({ merchants: [...state.merchants, merchant] })),

  setSelectedMerchant: (merchant) =>
    set({ selectedMerchant: merchant }),

  updateMerchant: (publicKey, updates) =>
    set((state) => ({
      merchants: state.merchants.map((m) =>
        m.publicKey === publicKey ? { ...m, ...updates } : m
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));

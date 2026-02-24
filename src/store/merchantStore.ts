import { create } from "zustand";
import { MerchantDisplay, MerchantProductDisplay, SeatTierDisplay } from "../types/merchant";

interface MerchantState {
  merchants: MerchantDisplay[];
  products: MerchantProductDisplay[];
  seatTiers: SeatTierDisplay[];
  selectedMerchant: MerchantDisplay | null;
  isLoading: boolean;
  error: string | null;
  setMerchants: (merchants: MerchantDisplay[]) => void;
  addMerchant: (merchant: MerchantDisplay) => void;
  setSelectedMerchant: (merchant: MerchantDisplay | null) => void;
  updateMerchant: (publicKey: string, updates: Partial<MerchantDisplay>) => void;
  setProducts: (products: MerchantProductDisplay[]) => void;
  mergeProducts: (products: MerchantProductDisplay[], merchantKey: string) => void;
  setSeatTiers: (tiers: SeatTierDisplay[]) => void;
  mergeSeatTiers: (tiers: SeatTierDisplay[], eventKey: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMerchantStore = create<MerchantState>((set) => ({
  merchants: [],
  products: [],
  seatTiers: [],
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

  setProducts: (products) => set({ products }),

  mergeProducts: (newProducts, merchantKey) =>
    set((state) => {
      // Remove existing products for this merchant, then add the new ones
      const other = state.products.filter((p) => p.merchantKey !== merchantKey);
      return { products: [...other, ...newProducts] };
    }),

  setSeatTiers: (tiers) => set({ seatTiers: tiers }),

  mergeSeatTiers: (newTiers, eventKey) =>
    set((state) => {
      const other = state.seatTiers.filter((t) => t.eventKey !== eventKey);
      return { seatTiers: [...other, ...newTiers] };
    }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));

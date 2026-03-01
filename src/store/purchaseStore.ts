import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PURCHASES_KEY = "passpay_purchases";

export interface PurchaseReceipt {
  id: string;
  productName: string;
  merchantName: string;
  merchantAuthority: string;
  eventKey: string;
  amount: number; // SOL
  buyer: string;
  timestamp: number;
  txSignature?: string;
}

interface PurchaseState {
  purchases: PurchaseReceipt[];
  isLoaded: boolean;
  loadPurchases: () => Promise<void>;
  addPurchase: (receipt: PurchaseReceipt) => Promise<void>;
  clearPurchases: () => Promise<void>;
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  purchases: [],
  isLoaded: false,

  loadPurchases: async () => {
    try {
      const raw = await AsyncStorage.getItem(PURCHASES_KEY);
      const purchases: PurchaseReceipt[] = raw ? JSON.parse(raw) : [];
      set({ purchases, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  addPurchase: async (receipt) => {
    const current = get().purchases;
    const updated = [receipt, ...current];
    set({ purchases: updated });
    try {
      await AsyncStorage.setItem(PURCHASES_KEY, JSON.stringify(updated));
    } catch {
      // Silently fail — purchase is still in memory
    }
  },

  clearPurchases: async () => {
    set({ purchases: [] });
    await AsyncStorage.removeItem(PURCHASES_KEY);
  },
}));

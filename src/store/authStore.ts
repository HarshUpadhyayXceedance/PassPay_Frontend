import { create } from "zustand";
import { PublicKey, Connection } from "@solana/web3.js";
import * as SecureStore from "expo-secure-store";
import { UserRole } from "../types/navigation";
import { detectUserRole } from "../services/roleDetection";
import { DEVNET_RPC } from "../solana/config/constants";

const ROLE_STORAGE_KEY = "user_role";
const WALLET_STORAGE_KEY = "user_wallet";

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  isLoading: boolean;
  isDetectingRole: boolean;
  error: string | null;

  // Actions
  detectRole: (walletPublicKey: string) => Promise<void>;
  loadStoredRole: () => Promise<void>;
  setAuthenticated: (authenticated: boolean) => void;
  setRole: (role: UserRole | null) => void;
  setLoading: (loading: boolean) => void;
  setDetectingRole: (detecting: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  role: null,
  isLoading: false,
  isDetectingRole: false,
  error: null,

  detectRole: async (walletPublicKey: string) => {
    set({ isDetectingRole: true, error: null });
    try {
      const pubKey = new PublicKey(walletPublicKey);
      const connection = new Connection(DEVNET_RPC, "confirmed");

      console.log("🔍 Detecting role for wallet:", walletPublicKey);
      const role = await detectUserRole(pubKey, connection);

      // Store role and wallet in SecureStore for persistence
      await SecureStore.setItemAsync(ROLE_STORAGE_KEY, role);
      await SecureStore.setItemAsync(WALLET_STORAGE_KEY, walletPublicKey);

      set({
        role,
        isAuthenticated: true,
        isDetectingRole: false,
      });

      console.log("✅ Role detection complete:", role);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to detect user role";
      set({
        isDetectingRole: false,
        error: errorMessage,
        isAuthenticated: false,
        role: null,
      });
      console.error("❌ Role detection failed:", errorMessage);
      throw error;
    }
  },

  loadStoredRole: async () => {
    set({ isLoading: true });
    try {
      const storedRole = await SecureStore.getItemAsync(ROLE_STORAGE_KEY);
      const storedWallet = await SecureStore.getItemAsync(WALLET_STORAGE_KEY);

      if (storedRole && storedWallet) {
        console.log("📦 Loaded stored role:", storedRole);
        set({
          role: storedRole as UserRole,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error("❌ Failed to load stored role:", error);
      set({ isLoading: false });
    }
  },

  setAuthenticated: (authenticated) =>
    set({ isAuthenticated: authenticated }),

  setRole: (role) => set({ role }),

  setLoading: (loading) => set({ isLoading: loading }),

  setDetectingRole: (detecting) => set({ isDetectingRole: detecting }),

  setError: (error) => set({ error }),

  logout: async () => {
    // Clear stored credentials
    try {
      await SecureStore.deleteItemAsync(ROLE_STORAGE_KEY);
      await SecureStore.deleteItemAsync(WALLET_STORAGE_KEY);
    } catch (error) {
      console.error("❌ Failed to clear stored credentials:", error);
    }

    set({
      isAuthenticated: false,
      role: null,
      isLoading: false,
      isDetectingRole: false,
      error: null,
    });
  },
}));

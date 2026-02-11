import { create } from "zustand";
import { PublicKey, Connection } from "@solana/web3.js";
import { UserRole } from "../types/navigation";
import { detectUserRole } from "../services/roleDetection";
import { DEVNET_RPC } from "../solana/config/constants";

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  detectRole: (walletPublicKey: string) => Promise<void>;
  setAuthenticated: (authenticated: boolean) => void;
  setRole: (role: UserRole | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  role: null,
  isLoading: false,
  error: null,

  detectRole: async (walletPublicKey: string) => {
    set({ isLoading: true, error: null });
    try {
      const pubKey = new PublicKey(walletPublicKey);
      const connection = new Connection(DEVNET_RPC, "confirmed");

      console.log("🔍 Detecting role for wallet:", walletPublicKey);
      const role = await detectUserRole(pubKey, connection);

      set({
        role,
        isAuthenticated: true,
        isLoading: false,
      });

      console.log("✅ Role detection complete:", role);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to detect user role";
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
        role: null,
      });
      console.error("❌ Role detection failed:", errorMessage);
      throw error;
    }
  },

  setAuthenticated: (authenticated) =>
    set({ isAuthenticated: authenticated }),

  setRole: (role) => set({ role }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  logout: () =>
    set({
      isAuthenticated: false,
      role: null,
      isLoading: false,
      error: null,
    }),
}));

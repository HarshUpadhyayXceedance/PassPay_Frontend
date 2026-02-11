import { create } from "zustand";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { phantomWalletAdapter } from "../solana/wallet/phantomWalletAdapter";
import { DEVNET_RPC } from "../solana/config/constants";

interface WalletState {
  publicKey: string | null;
  balance: number; // in SOL
  isConnected: boolean;
  isConnecting: boolean;
  walletType: "phantom" | null;
  error: string | null;

  // Actions
  connectPhantom: () => Promise<void>;
  disconnectPhantom: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  setPublicKey: (key: string | null) => void;
  setBalance: (balance: number) => void;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  publicKey: null,
  balance: 0,
  isConnected: false,
  isConnecting: false,
  walletType: null,
  error: null,

  connectPhantom: async () => {
    set({ isConnecting: true, error: null });
    try {
      const publicKey = await phantomWalletAdapter.connect();

      set({
        publicKey: publicKey.toBase58(),
        isConnected: true,
        isConnecting: false,
        walletType: "phantom",
      });

      // Refresh balance after connection
      await get().refreshBalance();
      console.log("✅ Phantom wallet connected:", publicKey.toBase58());
    } catch (error: any) {
      const errorMessage =
        error.message || "Failed to connect to Phantom wallet";
      set({
        isConnecting: false,
        error: errorMessage,
      });
      console.error("❌ Phantom connection failed:", errorMessage);
      throw error;
    }
  },

  disconnectPhantom: async () => {
    try {
      await phantomWalletAdapter.disconnect();
      set({
        publicKey: null,
        balance: 0,
        isConnected: false,
        walletType: null,
        error: null,
      });
      console.log("✅ Phantom wallet disconnected");
    } catch (error: any) {
      console.error("❌ Disconnect failed:", error.message);
      // Even if disconnect fails, clear state
      set({
        publicKey: null,
        balance: 0,
        isConnected: false,
        walletType: null,
      });
    }
  },

  refreshBalance: async () => {
    const { publicKey } = get();
    if (!publicKey) return;

    try {
      const connection = new Connection(DEVNET_RPC, "confirmed");
      const pubKey = new PublicKey(publicKey);
      const lamports = await connection.getBalance(pubKey);
      const solBalance = lamports / LAMPORTS_PER_SOL;

      set({ balance: solBalance });
      console.log("💰 Balance refreshed:", solBalance, "SOL");
    } catch (error: any) {
      console.error("❌ Failed to refresh balance:", error.message);
    }
  },

  setPublicKey: (key) => set({ publicKey: key }),
  setBalance: (balance) => set({ balance }),
  setConnected: (connected) => set({ isConnected: connected }),
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  setError: (error) => set({ error }),
}));

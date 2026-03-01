import { create } from "zustand";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { phantomWalletAdapter } from "../solana/wallet/phantomWalletAdapter";
import { DEVNET_RPC } from "../solana/config/constants";

const PERSISTED_WALLET_KEY = "persisted_wallet_pubkey";

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
  restorePersistedWallet: () => Promise<boolean>;
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
      const pubkeyStr = publicKey.toBase58();

      set({
        publicKey: pubkeyStr,
        isConnected: true,
        isConnecting: false,
        walletType: "phantom",
      });

      // Persist wallet key so it survives Activity restarts (orientation change)
      await AsyncStorage.setItem(PERSISTED_WALLET_KEY, pubkeyStr).catch(() => {});

      // Refresh balance after connection
      await get().refreshBalance();
      console.log("✅ Phantom wallet connected:", pubkeyStr);
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
      // Clear persisted wallet
      await AsyncStorage.removeItem(PERSISTED_WALLET_KEY).catch(() => {});
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
      await AsyncStorage.removeItem(PERSISTED_WALLET_KEY).catch(() => {});
    }
  },

  /**
   * Restore wallet connection from AsyncStorage after JS context restart
   * (e.g. Activity recreation on orientation change). This sets publicKey
   * and isConnected so the auth flow doesn't redirect to welcome.
   * The MWA session will be re-established on the next transaction.
   */
  restorePersistedWallet: async (): Promise<boolean> => {
    try {
      const storedKey = await AsyncStorage.getItem(PERSISTED_WALLET_KEY);
      if (storedKey) {
        set({
          publicKey: storedKey,
          isConnected: true,
          walletType: "phantom",
        });
        // Restore the adapter's public key (read-only; MWA re-auth on next tx)
        phantomWalletAdapter.restorePublicKey(new PublicKey(storedKey));
        console.log("📦 Wallet restored from persistence:", storedKey.slice(0, 8));
        return true;
      }
    } catch (e) {
      console.warn("Failed to restore wallet:", e);
    }
    return false;
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

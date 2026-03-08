import { create } from "zustand";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { phantomWalletAdapter } from "../solana/wallet/phantomWalletAdapter";
import { DEVNET_RPC } from "../solana/config/constants";
import { clearAuthToken, getAuthToken } from "../utils/backendAuth";

const PERSISTED_WALLET_KEY = "persisted_wallet_pubkey";

let _solanaConnection: Connection | null = null;
function getSolanaConnection(): Connection {
  if (!_solanaConnection) {
    _solanaConnection = new Connection(DEVNET_RPC, "confirmed");
  }
  return _solanaConnection;
}

interface WalletState {
  publicKey: string | null;
  balance: number;
  isConnected: boolean;
  isConnecting: boolean;
  walletType: "phantom" | null;
  error: string | null;

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

      await AsyncStorage.setItem(PERSISTED_WALLET_KEY, pubkeyStr).catch(() => {});

      await get().refreshBalance();

      console.log("Phantom wallet connected:", pubkeyStr);
    } catch (error: any) {
      const errorMessage =
        error.message || "Failed to connect to Phantom wallet";
      set({
        isConnecting: false,
        error: errorMessage,
      });
      console.error("Phantom connection failed:", errorMessage);
      throw error;
    }
  },

  disconnectPhantom: async () => {
    try {
      await phantomWalletAdapter.disconnect();
      const { publicKey: prevKey } = get();
      if (prevKey) await clearAuthToken(prevKey).catch(() => {});

      set({
        publicKey: null,
        balance: 0,
        isConnected: false,
        walletType: null,
        error: null,
      });
      await AsyncStorage.removeItem(PERSISTED_WALLET_KEY).catch(() => {});
      console.log("Phantom wallet disconnected");
    } catch (error: any) {
      console.error("Disconnect failed:", error.message);
      const { publicKey: failKey } = get();
      if (failKey) await clearAuthToken(failKey).catch(() => {});
      set({
        publicKey: null,
        balance: 0,
        isConnected: false,
        walletType: null,
      });
      await AsyncStorage.removeItem(PERSISTED_WALLET_KEY).catch(() => {});
    }
  },

  restorePersistedWallet: async (): Promise<boolean> => {
    try {
      const storedKey = await AsyncStorage.getItem(PERSISTED_WALLET_KEY);
      if (storedKey) {
        set({
          publicKey: storedKey,
          isConnected: true,
          walletType: "phantom",
        });
        phantomWalletAdapter.restorePublicKey(new PublicKey(storedKey));
        const token = await getAuthToken(storedKey);
        console.log("Wallet restored from persistence:", storedKey.slice(0, 8), token ? "(JWT valid)" : "(no JWT — will use legacy auth)");
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
      const connection = getSolanaConnection();
      const pubKey = new PublicKey(publicKey);
      const lamports = await connection.getBalance(pubKey);
      const solBalance = lamports / LAMPORTS_PER_SOL;

      set({ balance: solBalance, error: null });
      console.log("Balance refreshed:", solBalance, "SOL");
    } catch (error: any) {
      console.error("Failed to refresh balance:", error.message);
      _solanaConnection = null;
      set({ error: "Unable to fetch balance. Check your connection." });
    }
  },

  setPublicKey: (key) => set({ publicKey: key }),
  setBalance: (balance) => set({ balance }),
  setConnected: (connected) => set({ isConnected: connected }),
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  setError: (error) => set({ error }),
}));

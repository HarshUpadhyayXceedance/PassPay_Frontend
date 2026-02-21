import { useCallback } from "react";
import { useWalletStore } from "../store/walletStore";
import { useAuthStore } from "../store/authStore";

/**
 * useWallet hook - Phantom wallet integration
 *
 * This hook provides a unified interface to wallet operations
 * using Phantom Mobile Wallet Adapter (Solana Mobile Stack)
 */
export function useWallet() {
  const walletStore = useWalletStore();
  const authStore = useAuthStore();

  const connect = useCallback(async () => {
    try {
      await walletStore.connectPhantom();

      // Read latest publicKey from store state (not the stale closure snapshot)
      const publicKey = useWalletStore.getState().publicKey;
      if (publicKey) {
        await authStore.detectRole(publicKey);
      }
    } catch (error) {
      console.error("Wallet connect error:", error);
      throw error;
    }
  }, [walletStore, authStore]);

  const disconnect = useCallback(async () => {
    await walletStore.disconnectPhantom();
    authStore.logout();
  }, [walletStore, authStore]);

  const refreshBalance = useCallback(async () => {
    await walletStore.refreshBalance();
  }, [walletStore]);

  return {
    // State
    publicKey: walletStore.publicKey,
    balance: walletStore.balance,
    isConnected: walletStore.isConnected,
    isConnecting: walletStore.isConnecting,
    walletType: walletStore.walletType,
    error: walletStore.error,

    // Actions
    connect,
    disconnect,
    refreshBalance,
  };
}

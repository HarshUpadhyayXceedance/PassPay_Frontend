import { useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useMerchantStore } from "../store/merchantStore";
import { getProgram } from "../solana/config/program";
import { createProvider } from "../solana/wallet/walletSession";
import { getWalletAdapter } from "./useWallet";
import { MerchantDisplay } from "../types/merchant";
import { lamportsToSOL } from "../utils/formatters";

export function useMerchants() {
  const store = useMerchantStore();

  const fetchMerchants = useCallback(async (eventKey?: string) => {
    store.setLoading(true);
    store.setError(null);
    try {
      const wallet = getWalletAdapter();
      if (!wallet) throw new Error("Wallet not connected");

      const provider = createProvider(wallet);
      const program = getProgram(provider);

      const allMerchants = await program.account.merchant.all();
      let filtered = allMerchants;

      if (eventKey) {
        filtered = allMerchants.filter(
          (m: any) => m.account.event.toBase58() === eventKey
        );
      }

      const merchants: MerchantDisplay[] = filtered.map((acc: any) => {
        const data = acc.account as any;
        return {
          publicKey: acc.publicKey.toBase58(),
          authority: data.authority.toBase58(),
          eventKey: data.event.toBase58(),
          name: data.name,
          isActive: data.isActive,
          totalReceived: lamportsToSOL(data.totalReceived.toNumber()),
        };
      });

      store.setMerchants(merchants);
    } catch (error: any) {
      store.setError(error.message ?? "Failed to fetch merchants");
    } finally {
      store.setLoading(false);
    }
  }, []);

  return {
    merchants: store.merchants,
    selectedMerchant: store.selectedMerchant,
    isLoading: store.isLoading,
    error: store.error,
    fetchMerchants,
    setSelectedMerchant: store.setSelectedMerchant,
  };
}

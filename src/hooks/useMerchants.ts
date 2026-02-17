import { useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useMerchantStore } from "../store/merchantStore";
import { getConnection } from "../solana/config/connection";
import { getProgram } from "../solana/config/program";
import { createProvider } from "../solana/wallet/walletSession";
import { phantomWalletAdapter } from "../solana/wallet/phantomWalletAdapter";
import { MerchantDisplay } from "../types/merchant";
import { lamportsToSOL, decodeAccountString } from "../utils/formatters";
import { safeFetchAll } from "../solana/utils/safeFetchAll";

export function useMerchants() {
  const store = useMerchantStore();

  const fetchMerchants = useCallback(async (eventKey?: string) => {
    store.setLoading(true);
    store.setError(null);
    try {
      const wallet = phantomWalletAdapter;
      if (!wallet.getPublicKey()) throw new Error("Wallet not connected");

      const provider = createProvider(wallet);
      const program = getProgram(provider);
      const connection = getConnection();

      // Use safeFetchAll instead of program.account.merchant.all() to handle
      // old-schema accounts that are missing the image_url field
      const allMerchants = await safeFetchAll(connection, program, "Merchant");
      let filtered = allMerchants;

      if (eventKey) {
        filtered = allMerchants.filter(
          (m: any) => m.account.event.toBase58() === eventKey
        );
      }

      const merchants: MerchantDisplay[] = [];
      for (const acc of filtered) {
        try {
          const data = acc.account as any;
          merchants.push({
            publicKey: acc.publicKey.toBase58(),
            authority: data.authority.toBase58(),
            eventKey: data.event.toBase58(),
            name: decodeAccountString(data.name),
            description: decodeAccountString(data.description ?? ""),
            imageUrl: decodeAccountString(data.imageUrl ?? ""),
            isActive: data.isActive,
            totalReceived: lamportsToSOL(data.totalReceived.toNumber()),
          });
        } catch (e) {
          // Skip accounts with old schema that can't be deserialized
          console.warn("Skipping merchant account", acc.publicKey.toBase58(), e);
        }
      }

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

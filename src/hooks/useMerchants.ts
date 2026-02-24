import { useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useMerchantStore } from "../store/merchantStore";
import { getConnection } from "../solana/config/connection";
import { getProgram } from "../solana/config/program";
import { createProvider } from "../solana/wallet/walletSession";
import { phantomWalletAdapter } from "../solana/wallet/phantomWalletAdapter";
import { MerchantDisplay, MerchantProductDisplay, SeatTierDisplay } from "../types/merchant";
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

  const fetchProducts = useCallback(async (merchantKey?: string) => {
    try {
      const wallet = phantomWalletAdapter;
      if (!wallet.getPublicKey()) throw new Error("Wallet not connected");

      const provider = createProvider(wallet);
      const program = getProgram(provider);

      const allProducts = await program.account.merchantProduct.all();
      let filtered = allProducts;

      if (merchantKey) {
        filtered = allProducts.filter(
          (p: any) => p.account.merchant.toBase58() === merchantKey
        );
      }

      const products: MerchantProductDisplay[] = filtered.map((acc: any) => {
        const data = acc.account as any;
        return {
          publicKey: acc.publicKey.toBase58(),
          merchantKey: data.merchant.toBase58(),
          name: decodeAccountString(data.name),
          description: decodeAccountString(data.description ?? ""),
          price: lamportsToSOL(data.price?.toNumber?.() ?? 0),
          imageUrl: decodeAccountString(data.imageUrl ?? ""),
          isAvailable: data.isAvailable,
          totalSold: data.totalSold,
        };
      });

      if (merchantKey) {
        store.mergeProducts(products, merchantKey);
      } else {
        store.setProducts(products);
      }
    } catch (error: any) {
      console.warn("Failed to fetch products:", error.message);
    }
  }, []);

  const fetchSeatTiers = useCallback(async (eventKey?: string) => {
    try {
      const wallet = phantomWalletAdapter;
      if (!wallet.getPublicKey()) throw new Error("Wallet not connected");

      const provider = createProvider(wallet);
      const program = getProgram(provider);

      const allTiers = await program.account.seatTier.all();
      let filtered = allTiers;

      if (eventKey) {
        filtered = allTiers.filter(
          (t: any) => t.account.event.toBase58() === eventKey
        );
      }

      const tiers: SeatTierDisplay[] = filtered.map((acc: any) => {
        const data = acc.account as any;
        const priceLamports = data.price?.toNumber?.() ?? 0;
        const totalSeats = data.totalSeats ?? 0;
        const seatsSold = data.seatsSold ?? 0;
        return {
          publicKey: acc.publicKey.toBase58(),
          eventKey: data.event.toBase58(),
          name: decodeAccountString(data.name),
          price: lamportsToSOL(priceLamports),
          priceLamports,
          totalSeats,
          seatsSold,
          availableSeats: totalSeats - seatsSold,
          tierLevel: data.tierLevel,
          isRestricted: data.isRestricted,
        };
      });

      tiers.sort((a, b) => a.tierLevel - b.tierLevel);
      if (eventKey) {
        store.mergeSeatTiers(tiers, eventKey);
      } else {
        store.setSeatTiers(tiers);
      }
    } catch (error: any) {
      console.warn("Failed to fetch seat tiers:", error.message);
    }
  }, []);

  return {
    merchants: store.merchants,
    products: store.products,
    seatTiers: store.seatTiers,
    selectedMerchant: store.selectedMerchant,
    isLoading: store.isLoading,
    error: store.error,
    fetchMerchants,
    fetchProducts,
    fetchSeatTiers,
    setSelectedMerchant: store.setSelectedMerchant,
  };
}

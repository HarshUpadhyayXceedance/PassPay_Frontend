import { useCallback, useEffect } from "react";
import { PublicKey, Connection } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { useLoyaltyStore } from "../store/loyaltyStore";
import { useWalletStore } from "../store/walletStore";
import { checkLoyaltyBenefits } from "../solana/actions/checkLoyaltyBenefits";
import { getProgram } from "../solana/config/program";
import { findBadgeCollectionPda } from "../solana/pda";
import { DEVNET_RPC } from "../solana/config/constants";
import { BadgeCollectionData, parseBadgeTier } from "../types/loyalty";
import { decodeAccountString } from "../utils/formatters";

export function useLoyalty() {
  const { publicKey } = useWalletStore();
  const store = useLoyaltyStore();

  const fetchLoyaltyBenefits = useCallback(async () => {
    if (!publicKey) return;

    store.setLoading(true);
    store.setError(null);

    try {
      const userPubkey = new PublicKey(publicKey);
      const { attendance, benefits } = await checkLoyaltyBenefits(userPubkey);

      store.setUserAttendance(attendance);
      store.setLoyaltyBenefits(benefits);
    } catch (error: any) {
      console.error("Failed to fetch loyalty benefits:", error);
      store.setError(error.message || "Failed to fetch loyalty data");
    } finally {
      store.setLoading(false);
    }
  }, [publicKey]);

  const fetchBadgeCollection = useCallback(async () => {
    try {
      const connection = new Connection(DEVNET_RPC, "confirmed");
      const provider = new AnchorProvider(
        connection,
        {} as any,
        { commitment: "confirmed" }
      );
      const program = getProgram(provider);
      const [badgeCollectionPda] = findBadgeCollectionPda();

      const account = await program.account.badgeCollection.fetch(badgeCollectionPda);

      const collection: BadgeCollectionData = {
        authority: account.authority,
        totalIssued: typeof account.totalIssued === "number"
          ? account.totalIssued
          : account.totalIssued.toNumber(),
        bronzeBadgeMint: account.bronzeBadgeMint,
        silverBadgeMint: account.silverBadgeMint,
        goldBadgeMint: account.goldBadgeMint,
        platinumBadgeMint: account.platinumBadgeMint,
        collectionName: decodeAccountString(account.collectionName),
        collectionSymbol: decodeAccountString(account.collectionSymbol),
        collectionUri: decodeAccountString(account.collectionUri),
        bump: account.bump,
      };

      store.setBadgeCollection(collection);
    } catch {
      store.setBadgeCollection(null);
    }
  }, []);

  useEffect(() => {
    if (publicKey) {
      fetchLoyaltyBenefits();
      fetchBadgeCollection();
    }
  }, [publicKey]);

  return {
    loyaltyBenefits: store.loyaltyBenefits,
    userAttendance: store.userAttendance,
    badgeCollection: store.badgeCollection,
    isLoading: store.isLoading,
    error: store.error,
    fetchLoyaltyBenefits,
    fetchBadgeCollection,
  };
}

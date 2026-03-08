import {
  PublicKey,
  Connection,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda } from "../pda";
import { DEVNET_RPC } from "../config/constants";
import { phantomWalletAdapter } from "../wallet/phantomWalletAdapter";
import { createProvider } from "../wallet/walletSession";
import { EnableDynamicPricingParams } from "../../types/loyalty";

export async function enableDynamicPricing(
  adminPubkey: PublicKey,
  eventPubkey: PublicKey,
  params: EnableDynamicPricingParams
): Promise<string> {
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const provider = createProvider(phantomWalletAdapter, connection);

  const program = getProgram(provider);
  const [adminPda] = findAdminPda(adminPubkey);

  const tx = await program.methods
    .enableDynamicPricing({
      minPrice: new BN(params.minPrice),
      maxPrice: new BN(params.maxPrice),
      demandFactor: params.demandFactor,
      timeFactor: params.timeFactor,
      scarcityPremium: params.scarcityPremium,
      updateInterval: new BN(params.updateInterval),
    })
    .accounts({
      adminAuthority: adminPubkey,
      admin: adminPda,
      event: eventPubkey,
    })
    .rpc();

  return tx;
}

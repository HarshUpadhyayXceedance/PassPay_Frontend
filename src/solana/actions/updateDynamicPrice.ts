import { PublicKey, Connection } from "@solana/web3.js";
import { getProgram } from "../config/program";
import { DEVNET_RPC } from "../config/constants";
import { phantomWalletAdapter } from "../wallet/phantomWalletAdapter";
import { createProvider } from "../wallet/walletSession";

/**
 * Recalculate and update event ticket price (anyone can call, rate-limited)
 */
export async function updateDynamicPrice(
  callerPubkey: PublicKey,
  eventPubkey: PublicKey
): Promise<string> {
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const provider = createProvider(phantomWalletAdapter, connection);

  const program = getProgram(provider);

  const tx = await program.methods
    .updateDynamicPrice()
    .accounts({
      caller: callerPubkey,
      event: eventPubkey,
    })
    .rpc();

  return tx;
}

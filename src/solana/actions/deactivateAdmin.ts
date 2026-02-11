import { PublicKey, Connection, Transaction } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda } from "../pda";
import { DEVNET_RPC } from "../config/constants";
import { phantomWalletAdapter } from "../wallet/phantomWalletAdapter";

/**
 * Deactivate an admin account (SuperAdmin only)
 *
 * @param superAdminPubkey - The SuperAdmin's public key (signer)
 * @param adminPubkey - The admin's public key to deactivate
 * @returns Transaction signature
 */
export async function deactivateAdmin(
  superAdminPubkey: PublicKey,
  adminPubkey: PublicKey
): Promise<string> {
  const connection = new Connection(DEVNET_RPC, "confirmed");

  // Create a wallet wrapper for the phantom adapter
  const wallet: Wallet = {
    publicKey: superAdminPubkey,
    signTransaction: async (tx: Transaction) => {
      return await phantomWalletAdapter.signTransaction(tx);
    },
    signAllTransactions: async (txs: Transaction[]) => {
      return await phantomWalletAdapter.signAllTransactions(txs);
    },
  };

  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const program = getProgram(provider);
  const [adminPda] = findAdminPda(adminPubkey);

  const tx = await program.methods
    .deactivateAdmin()
    .accounts({
      authority: superAdminPubkey,
      admin: adminPda,
    })
    .rpc();

  return tx;
}

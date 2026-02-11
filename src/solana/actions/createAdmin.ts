import { PublicKey, SystemProgram, Connection, Transaction } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda } from "../pda";
import { DEVNET_RPC } from "../config/constants";
import { phantomWalletAdapter } from "../wallet/phantomWalletAdapter";

/**
 * Create a new admin account (SuperAdmin only)
 *
 * @param superAdminPubkey - The SuperAdmin's public key (signer)
 * @param adminPubkey - The new admin's public key
 * @param name - The admin's name (max 64 chars)
 * @returns Transaction signature
 */
export async function createAdmin(
  superAdminPubkey: PublicKey,
  adminPubkey: PublicKey,
  name: string
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
    .createAdmin({
      name,
    })
    .accounts({
      authority: superAdminPubkey,
      admin: adminPda,
      adminAuthority: adminPubkey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

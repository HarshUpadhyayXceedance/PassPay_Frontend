import { PublicKey, SystemProgram, Connection } from "@solana/web3.js";
import { getProgram } from "../config/program";
import { findAdminPda } from "../pda";
import { DEVNET_RPC } from "../config/constants";
import { phantomWalletAdapter } from "../wallet/phantomWalletAdapter";
import { createProvider } from "../wallet/walletSession";

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
  const provider = createProvider(phantomWalletAdapter, connection);

  const program = getProgram(provider);
  const [adminPda] = findAdminPda(adminPubkey);

  const tx = await program.methods
    .createAdmin({
      name,
    })
    .accounts({
      superAdmin: superAdminPubkey,
      adminAuthority: adminPubkey,
      admin: adminPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

import { PublicKey, Connection } from "@solana/web3.js";
import { getProgram } from "../config/program";
import { findAdminPda } from "../pda";
import { DEVNET_RPC } from "../config/constants";
import { phantomWalletAdapter } from "../wallet/phantomWalletAdapter";
import { createProvider } from "../wallet/walletSession";

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
  const provider = createProvider(phantomWalletAdapter, connection);

  const program = getProgram(provider);
  const [adminPda] = findAdminPda(adminPubkey);

  const tx = await program.methods
    .deactivateAdmin()
    .accounts({
      superAdmin: superAdminPubkey,
      admin: adminPda,
    })
    .rpc();

  return tx;
}

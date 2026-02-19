import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda } from "../pda";

/**
 * Close/deactivate an event (Admin only).
 * Sets event.is_active = false on-chain.
 *
 * @param provider - Anchor provider with admin wallet
 * @param eventPda - The event account public key
 * @returns Transaction signature
 */
export async function closeEvent(
  provider: AnchorProvider,
  eventPda: PublicKey
): Promise<string> {
  const program = getProgram(provider);
  const adminKey = provider.wallet.publicKey;
  const [adminPda] = findAdminPda(adminKey);

  const tx = await program.methods
    .closeEvent()
    .accounts({
      adminAuthority: adminKey,
      admin: adminPda,
      event: eventPda,
    })
    .rpc();

  return tx;
}

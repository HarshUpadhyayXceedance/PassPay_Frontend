import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda } from "../pda";

/**
 * End meeting for an online event (Admin only).
 * Sets event.is_meeting_ended = true on-chain.
 *
 * @param provider - Anchor provider with admin wallet
 * @param eventPda - The event account public key
 * @returns Transaction signature
 */
export async function endMeeting(
  provider: AnchorProvider,
  eventPda: PublicKey
): Promise<string> {
  const program = getProgram(provider);
  const adminKey = provider.wallet.publicKey;
  const [adminPda] = findAdminPda(adminKey);

  const tx = await program.methods
    .endMeeting()
    .accounts({
      adminAuthority: adminKey,
      admin: adminPda,
      event: eventPda,
    })
    .rpc();

  return tx;
}

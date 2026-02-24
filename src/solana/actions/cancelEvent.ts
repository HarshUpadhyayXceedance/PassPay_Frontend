import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda, findEscrowPda } from "../pda";

export interface CancelEventParams {
  eventPda: PublicKey;
}

/**
 * Cancel an event (Admin / SuperAdmin).
 * Sets is_cancelled = true, is_active = false, extends refund window by 30 days.
 */
export async function cancelEvent(
  provider: AnchorProvider,
  params: CancelEventParams
): Promise<string> {
  const program = getProgram(provider);
  const adminKey = provider.wallet.publicKey;
  const [adminPda] = findAdminPda(adminKey);
  const [escrowPda] = findEscrowPda(params.eventPda);

  const tx = await program.methods
    .cancelEvent()
    .accounts({
      adminAuthority: adminKey,
      admin: adminPda,
      event: params.eventPda,
      eventEscrow: escrowPda,
    })
    .rpc();

  return tx;
}

import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda, findEscrowPda, findEscrowVaultPda } from "../pda";

export interface ReleaseFundsParams {
  eventPda: PublicKey;
  /** The wallet that created the event (event.admin). SOL is sent here. */
  eventCreator: PublicKey;
}

export async function releaseFunds(
  provider: AnchorProvider,
  params: ReleaseFundsParams
): Promise<string> {
  const program = getProgram(provider);
  const adminKey = provider.wallet.publicKey;

  const [adminPda] = findAdminPda(adminKey);
  const [escrowPda] = findEscrowPda(params.eventPda);
  const [escrowVaultPda] = findEscrowVaultPda(params.eventPda);

  const tx = await program.methods
    .releaseFunds()
    .accounts({
      adminAuthority: adminKey,
      admin: adminPda,
      event: params.eventPda,
      eventEscrow: escrowPda,
      escrowVault: escrowVaultPda,
      eventCreator: params.eventCreator,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

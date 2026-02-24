import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findTicketPda, findEscrowPda, findEscrowVaultPda } from "../pda";

export interface ClaimCancellationRefundParams {
  eventPda: PublicKey;
  ticketMint: PublicKey;
  seatTierPda: PublicKey;
}

export async function claimCancellationRefund(
  provider: AnchorProvider,
  params: ClaimCancellationRefundParams
): Promise<string> {
  const program = getProgram(provider);
  const holder = provider.wallet.publicKey;

  const [ticketPda] = findTicketPda(params.eventPda, params.ticketMint);
  const [escrowPda] = findEscrowPda(params.eventPda);
  const [escrowVaultPda] = findEscrowVaultPda(params.eventPda);

  const tx = await program.methods
    .claimCancellationRefund()
    .accounts({
      holder,
      event: params.eventPda,
      eventEscrow: escrowPda,
      escrowVault: escrowVaultPda,
      ticket: ticketPda,
      seatTier: params.seatTierPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

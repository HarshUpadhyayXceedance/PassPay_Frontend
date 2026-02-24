import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda, findTicketPda, findEscrowPda, findEscrowVaultPda, findRefundRequestPda } from "../pda";

export interface ApproveRefundParams {
  eventPda: PublicKey;
  ticketMint: PublicKey;
  holder: PublicKey;
  seatTierPda: PublicKey;
}

export async function approveRefund(
  provider: AnchorProvider,
  params: ApproveRefundParams
): Promise<string> {
  const program = getProgram(provider);
  const adminKey = provider.wallet.publicKey;

  const [adminPda] = findAdminPda(adminKey);
  const [ticketPda] = findTicketPda(params.eventPda, params.ticketMint);
  const [escrowPda] = findEscrowPda(params.eventPda);
  const [escrowVaultPda] = findEscrowVaultPda(params.eventPda);
  const [refundRequestPda] = findRefundRequestPda(params.eventPda, params.ticketMint);

  const tx = await program.methods
    .approveRefund()
    .accounts({
      adminAuthority: adminKey,
      admin: adminPda,
      event: params.eventPda,
      eventEscrow: escrowPda,
      escrowVault: escrowVaultPda,
      ticket: ticketPda,
      refundRequest: refundRequestPda,
      seatTier: params.seatTierPda,
      holder: params.holder,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

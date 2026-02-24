import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findTicketPda, findEscrowPda, findRefundRequestPda } from "../pda";
import { getAssociatedTokenAddress } from "../utils/tokenUtils";

export interface RequestRefundParams {
  eventPda: PublicKey;
  ticketMint: PublicKey;
}

export async function requestRefund(
  provider: AnchorProvider,
  params: RequestRefundParams
): Promise<string> {
  const program = getProgram(provider);
  const holder = provider.wallet.publicKey;

  const [ticketPda] = findTicketPda(params.eventPda, params.ticketMint);
  const [escrowPda] = findEscrowPda(params.eventPda);
  const [refundRequestPda] = findRefundRequestPda(params.eventPda, params.ticketMint);
  const holderTokenAccount = getAssociatedTokenAddress(params.ticketMint, holder);

  const tx = await program.methods
    .requestRefund()
    .accounts({
      holder,
      event: params.eventPda,
      eventEscrow: escrowPda,
      ticket: ticketPda,
      holderTokenAccount,
      refundRequest: refundRequestPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda, findRefundRequestPda } from "../pda";

export interface RejectRefundParams {
  eventPda: PublicKey;
  ticketMint: PublicKey;
}

export async function rejectRefund(
  provider: AnchorProvider,
  params: RejectRefundParams
): Promise<string> {
  const program = getProgram(provider);
  const adminKey = provider.wallet.publicKey;

  const [adminPda] = findAdminPda(adminKey);
  const [refundRequestPda] = findRefundRequestPda(params.eventPda, params.ticketMint);

  const tx = await program.methods
    .rejectRefund()
    .accounts({
      adminAuthority: adminKey,
      admin: adminPda,
      event: params.eventPda,
      refundRequest: refundRequestPda,
    })
    .rpc();

  return tx;
}

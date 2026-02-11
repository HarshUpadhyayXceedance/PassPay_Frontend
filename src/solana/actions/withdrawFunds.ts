import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda, findTreasuryPda } from "../pda";

export interface WithdrawFundsParams {
  eventPda: PublicKey;
  amount: number; // in SOL
}

export async function withdrawFunds(
  provider: AnchorProvider,
  params: WithdrawFundsParams
): Promise<string> {
  const program = getProgram(provider);
  const adminKey = provider.wallet.publicKey;
  const [adminPda] = findAdminPda(adminKey);
  const [treasuryPda] = findTreasuryPda(params.eventPda);

  const amountLamports = new BN(
    Math.round(params.amount * 1_000_000_000)
  );

  const tx = await program.methods
    .withdrawFunds({ amount: amountLamports })
    .accounts({
      adminAuthority: adminKey,
      admin: adminPda,
      event: params.eventPda,
      treasury: treasuryPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

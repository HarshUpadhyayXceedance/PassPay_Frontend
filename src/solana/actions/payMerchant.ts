import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findMerchantPda, findUserAttendancePda } from "../pda";

export interface PayMerchantParams {
  eventPda: PublicKey;
  merchantAuthority: PublicKey;
  amount: number;
}

export async function payMerchant(
  provider: AnchorProvider,
  params: PayMerchantParams
): Promise<string> {
  const program = getProgram(provider);
  const payer = provider.wallet.publicKey;
  const [merchantPda] = findMerchantPda(
    params.eventPda,
    params.merchantAuthority
  );
  const [userAttendanceRecord] = findUserAttendancePda(payer);

  const amountLamports = new BN(
    Math.round(params.amount * 1_000_000_000)
  );

  const tx = await program.methods
    .payMerchant({ amount: amountLamports })
    .accounts({
      payer,
      event: params.eventPda,
      merchant: merchantPda,
      merchantWallet: params.merchantAuthority,
      userAttendanceRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findMerchantPda, findProductPda, findUserAttendancePda } from "../pda";

export interface BuyProductParams {
  eventPda: PublicKey;
  merchantAuthority: PublicKey;
  productName: string;
}

export async function buyProduct(
  provider: AnchorProvider,
  params: BuyProductParams
): Promise<string> {
  const program = getProgram(provider);
  const payer = provider.wallet.publicKey;

  const [merchantPda] = findMerchantPda(params.eventPda, params.merchantAuthority);
  const [productPda] = findProductPda(merchantPda, params.productName);
  const [userAttendanceRecord] = findUserAttendancePda(payer);

  const tx = await program.methods
    .buyProduct()
    .accounts({
      payer,
      event: params.eventPda,
      merchant: merchantPda,
      merchantWallet: params.merchantAuthority,
      product: productPda,
      userAttendanceRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findMerchantPda, findProductPda } from "../pda";

export interface CollectProductParams {
  eventPda: PublicKey;
  merchantAuthority: PublicKey;
  productName: string;
  purchaseRecord: PublicKey;
}

export async function collectProduct(
  provider: AnchorProvider,
  params: CollectProductParams
): Promise<string> {
  const program = getProgram(provider);

  const [merchantPda] = findMerchantPda(params.eventPda, params.merchantAuthority);
  const [productPda] = findProductPda(merchantPda, params.productName);

  const tx = await program.methods
    .collectProduct()
    .accounts({
      authority: provider.wallet.publicKey,
      merchant: merchantPda,
      product: productPda,
      purchaseRecord: params.purchaseRecord,
    })
    .rpc();

  return tx;
}

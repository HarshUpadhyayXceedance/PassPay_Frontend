import { PublicKey } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findMerchantPda, findProductPda } from "../pda";

export interface UpdateProductParams {
  eventPda: PublicKey;
  productName: string;
  price?: number; // in lamports
  description?: string;
  imageUrl?: string;
  isAvailable?: boolean;
}

export async function updateProduct(
  provider: AnchorProvider,
  params: UpdateProductParams
): Promise<string> {
  const program = getProgram(provider);
  const merchantAuthority = provider.wallet.publicKey;

  const [merchantPda] = findMerchantPda(params.eventPda, merchantAuthority);
  const [productPda] = findProductPda(merchantPda, params.productName);

  const tx = await program.methods
    .updateProduct({
      price: params.price != null ? new BN(params.price) : null,
      description: params.description ?? null,
      imageUrl: params.imageUrl ?? null,
      isAvailable: params.isAvailable ?? null,
    })
    .accounts({
      merchantAuthority,
      merchant: merchantPda,
      product: productPda,
    })
    .rpc();

  return tx;
}

import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findMerchantPda, findProductPda } from "../pda";

export interface AddProductParams {
  eventPda: PublicKey;
  name: string;
  description: string;
  price: number; // in lamports
  imageUrl: string;
}

export async function addProduct(
  provider: AnchorProvider,
  params: AddProductParams
): Promise<string> {
  const program = getProgram(provider);
  const merchantAuthority = provider.wallet.publicKey;

  const [merchantPda] = findMerchantPda(params.eventPda, merchantAuthority);
  const [productPda] = findProductPda(merchantPda, params.name);

  const tx = await program.methods
    .addProduct({
      name: params.name,
      description: params.description,
      price: new BN(params.price),
      imageUrl: params.imageUrl,
    })
    .accounts({
      merchantAuthority,
      merchant: merchantPda,
      product: productPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

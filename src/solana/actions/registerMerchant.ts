import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda, findEventPda, findMerchantPda } from "../pda";

export interface RegisterMerchantParams {
  eventPda: PublicKey;
  merchantAuthority: PublicKey;
  name: string;
  description: string;
  imageUrl?: string;
}

export async function registerMerchant(
  provider: AnchorProvider,
  params: RegisterMerchantParams
): Promise<string> {
  const program = getProgram(provider);
  const adminKey = provider.wallet.publicKey;
  const [adminPda] = findAdminPda(adminKey);
  const [merchantPda] = findMerchantPda(
    params.eventPda,
    params.merchantAuthority
  );

  const tx = await program.methods
    .registerMerchant({ name: params.name, description: params.description, imageUrl: params.imageUrl ?? "" })
    .accounts({
      adminAuthority: adminKey,
      admin: adminPda,
      event: params.eventPda,
      merchant: merchantPda,
      merchantAuthority: params.merchantAuthority,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

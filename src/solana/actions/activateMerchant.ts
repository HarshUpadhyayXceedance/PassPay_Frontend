import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda, findMerchantPda } from "../pda";

export interface ActivateMerchantParams {
  eventPda: PublicKey;
  merchantAuthority: PublicKey;
}

export async function activateMerchant(
  provider: AnchorProvider,
  params: ActivateMerchantParams
): Promise<string> {
  const program = getProgram(provider);
  const adminKey = provider.wallet.publicKey;
  const [adminPda] = findAdminPda(adminKey);
  const [merchantPda] = findMerchantPda(
    params.eventPda,
    params.merchantAuthority
  );

  const tx = await program.methods
    .activateMerchant()
    .accounts({
      adminAuthority: adminKey,
      admin: adminPda,
      event: params.eventPda,
      merchant: merchantPda,
    })
    .rpc();

  return tx;
}

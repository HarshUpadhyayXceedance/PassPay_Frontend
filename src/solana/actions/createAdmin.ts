import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda } from "../pda";

export interface CreateAdminParams {
  name: string;
  adminAuthority: PublicKey;
}

export async function createAdmin(
  provider: AnchorProvider,
  params: CreateAdminParams
): Promise<string> {
  const program = getProgram(provider);
  const [adminPda] = findAdminPda(params.adminAuthority);

  const tx = await program.methods
    .createAdmin({
      name: params.name,
      adminAuthority: params.adminAuthority,
    })
    .accounts({
      superAdmin: provider.wallet.publicKey,
      adminAccount: adminPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

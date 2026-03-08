import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda } from "../pda";

export async function endMeeting(
  provider: AnchorProvider,
  eventPda: PublicKey
): Promise<string> {
  const program = getProgram(provider);
  const adminKey = provider.wallet.publicKey;
  const [adminPda] = findAdminPda(adminKey);

  const tx = await program.methods
    .endMeeting()
    .accounts({
      adminAuthority: adminKey,
      admin: adminPda,
      event: eventPda,
    })
    .rpc();

  return tx;
}

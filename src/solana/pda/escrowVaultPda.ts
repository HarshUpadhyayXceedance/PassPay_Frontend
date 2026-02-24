import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, ESCROW_VAULT_SEED } from "../config/constants";

export function findEscrowVaultPda(event: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ESCROW_VAULT_SEED), event.toBuffer()],
    PROGRAM_ID
  );
}

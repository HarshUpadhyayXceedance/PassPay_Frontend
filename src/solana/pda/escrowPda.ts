import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, ESCROW_SEED } from "../config/constants";

export function findEscrowPda(event: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ESCROW_SEED), event.toBuffer()],
    PROGRAM_ID
  );
}

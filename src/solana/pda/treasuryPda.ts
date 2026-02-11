import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, TREASURY_SEED } from "../config/constants";

export function findTreasuryPda(event: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(TREASURY_SEED), event.toBuffer()],
    PROGRAM_ID
  );
}

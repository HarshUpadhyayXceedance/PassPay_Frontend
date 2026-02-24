import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, SEAT_TIER_SEED } from "../config/constants";

export function findSeatTierPda(
  event: PublicKey,
  tierName: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEAT_TIER_SEED), event.toBuffer(), Buffer.from(tierName)],
    PROGRAM_ID
  );
}

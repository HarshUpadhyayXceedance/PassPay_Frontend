import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, BADGE_AUTHORITY_SEED } from "../config/constants";

export const findBadgeCollectionPda = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(BADGE_AUTHORITY_SEED)],
    PROGRAM_ID
  );
};

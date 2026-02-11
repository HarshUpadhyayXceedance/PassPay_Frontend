import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, EVENT_SEED } from "../config/constants";

export function findEventPda(
  admin: PublicKey,
  eventName: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(EVENT_SEED), admin.toBuffer(), Buffer.from(eventName)],
    PROGRAM_ID
  );
}

import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, TICKET_SEED } from "../config/constants";

export function findTicketPda(
  event: PublicKey,
  mint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(TICKET_SEED), event.toBuffer(), mint.toBuffer()],
    PROGRAM_ID
  );
}

import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, REFUND_SEED } from "../config/constants";

export function findRefundRequestPda(
  event: PublicKey,
  ticketMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(REFUND_SEED), event.toBuffer(), ticketMint.toBuffer()],
    PROGRAM_ID
  );
}

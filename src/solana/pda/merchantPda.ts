import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, MERCHANT_SEED } from "../config/constants";

export function findMerchantPda(
  event: PublicKey,
  authority: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(MERCHANT_SEED), event.toBuffer(), authority.toBuffer()],
    PROGRAM_ID
  );
}

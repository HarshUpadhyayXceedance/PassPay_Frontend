import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, PRODUCT_SEED } from "../config/constants";

export function findProductPda(
  merchant: PublicKey,
  productName: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PRODUCT_SEED), merchant.toBuffer(), Buffer.from(productName)],
    PROGRAM_ID
  );
}

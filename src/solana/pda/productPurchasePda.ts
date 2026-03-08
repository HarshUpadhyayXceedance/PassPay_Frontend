import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, PRODUCT_PURCHASE_SEED } from "../config/constants";

export function findProductPurchasePda(
  product: PublicKey,
  purchaseIndex: number
): [PublicKey, number] {
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32LE(purchaseIndex, 0);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PRODUCT_PURCHASE_SEED), product.toBuffer(), indexBuf],
    PROGRAM_ID
  );
}

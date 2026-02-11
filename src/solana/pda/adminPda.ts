import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, ADMIN_SEED } from "../config/constants";

export function findAdminPda(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ADMIN_SEED), authority.toBuffer()],
    PROGRAM_ID
  );
}

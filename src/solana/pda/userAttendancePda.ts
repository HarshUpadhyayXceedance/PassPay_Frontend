import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, ATTENDANCE_SEED } from "../config/constants";

export const findUserAttendancePda = (
  user: PublicKey
): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ATTENDANCE_SEED), user.toBuffer()],
    PROGRAM_ID
  );
};

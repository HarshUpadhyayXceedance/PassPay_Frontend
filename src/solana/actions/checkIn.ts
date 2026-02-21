import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda, findTicketPda, findUserAttendancePda } from "../pda";

export interface CheckInParams {
  eventPda: PublicKey;
  ticketMint: PublicKey;
  holderTokenAccount: PublicKey;
  ticketHolder: PublicKey;
}

export async function checkIn(
  provider: AnchorProvider,
  params: CheckInParams
): Promise<string> {
  const program = getProgram(provider);
  const adminKey = provider.wallet.publicKey;
  const [adminPda] = findAdminPda(adminKey);
  const [ticketPda] = findTicketPda(params.eventPda, params.ticketMint);
  const [userAttendanceRecord] = findUserAttendancePda(params.ticketHolder);

  const tx = await program.methods
    .checkIn()
    .accounts({
      adminAuthority: adminKey,
      admin: adminPda,
      event: params.eventPda,
      ticket: ticketPda,
      ticketMint: params.ticketMint,
      holderTokenAccount: params.holderTokenAccount,
      ticketHolder: params.ticketHolder,
      userAttendanceRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

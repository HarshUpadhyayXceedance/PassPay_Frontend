import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findTicketPda, findUserAttendancePda } from "../pda";

export interface SelfCheckInParams {
  eventPda: PublicKey;
  ticketMint: PublicKey;
}

export async function selfCheckIn(
  provider: AnchorProvider,
  params: SelfCheckInParams
): Promise<string> {
  const program = getProgram(provider);
  const attendee = provider.wallet.publicKey;

  const [ticketPda] = findTicketPda(params.eventPda, params.ticketMint);
  const [userAttendanceRecord] = findUserAttendancePda(attendee);

  const tx = await program.methods
    .selfCheckIn()
    .accounts({
      attendee,
      event: params.eventPda,
      ticket: ticketPda,
      ticketMint: params.ticketMint,
      userAttendanceRecord,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

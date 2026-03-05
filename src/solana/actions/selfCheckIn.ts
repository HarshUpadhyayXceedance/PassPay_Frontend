import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findTicketPda, findUserAttendancePda } from "../pda";

export interface SelfCheckInParams {
  /** The event PDA (public key of the event account) */
  eventPda: PublicKey;
  /** The NFT mint address of the ticket */
  ticketMint: PublicKey;
}

/**
 * Self check-in for online events.
 *
 * The ticket owner (attendee) signs this transaction — no admin required.
 * On-chain guards enforce:
 *   - Event must be marked `is_online = true`
 *   - `ticket.owner == attendee` (only the ticket owner can confirm)
 *   - `!ticket.is_checked_in` (cannot confirm twice)
 *   - `clock >= event.event_date` (cannot confirm before event starts)
 *
 * Calling this marks `ticket.is_checked_in = true` and updates the
 * attendee's `UserAttendanceRecord` (event count, streak, lifetime spend,
 * tier upgrade) exactly like a physical QR check-in.
 */
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

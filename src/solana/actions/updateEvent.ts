import { PublicKey, Connection } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda } from "../pda";
import { DEVNET_RPC } from "../config/constants";
import { phantomWalletAdapter } from "../wallet/phantomWalletAdapter";
import { createProvider } from "../wallet/walletSession";

export interface UpdateEventParams {
  venue?: string;
  description?: string;
  imageUrl?: string;
  eventDate?: number;
  ticketPrice?: number; // lamports
  totalSeats?: number;
}

/**
 * Update event details (Admin only)
 */
export async function updateEvent(
  adminPubkey: PublicKey,
  eventPubkey: PublicKey,
  params: UpdateEventParams
): Promise<string> {
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const provider = createProvider(phantomWalletAdapter, connection);

  const program = getProgram(provider);
  const [adminPda] = findAdminPda(adminPubkey);

  const tx = await program.methods
    .updateEvent({
      venue: params.venue ?? null,
      description: params.description ?? null,
      imageUrl: params.imageUrl ?? null,
      eventDate: params.eventDate ? new BN(params.eventDate) : null,
      ticketPrice: params.ticketPrice ? new BN(params.ticketPrice) : null,
      totalSeats: params.totalSeats ?? null,
    })
    .accounts({
      adminAuthority: adminPubkey,
      admin: adminPda,
      event: eventPubkey,
    })
    .rpc();

  return tx;
}

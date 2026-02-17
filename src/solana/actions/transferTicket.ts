import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findTicketPda } from "../pda";
import {
  findMintAuthorityPda,
  getAssociatedTokenAddress,
} from "../utils/tokenUtils";

export interface TransferTicketParams {
  eventPda: PublicKey;
  ticketMint: PublicKey;
  recipient: PublicKey;
}

export async function transferTicket(
  provider: AnchorProvider,
  params: TransferTicketParams
): Promise<string> {
  const program = getProgram(provider);
  const sender = provider.wallet.publicKey;
  const [ticketPda] = findTicketPda(params.eventPda, params.ticketMint);
  const [mintAuthority] = findMintAuthorityPda();

  const senderTokenAccount = getAssociatedTokenAddress(
    params.ticketMint,
    sender
  );
  const recipientTokenAccount = getAssociatedTokenAddress(
    params.ticketMint,
    params.recipient
  );

  const tx = await program.methods
    .transferTicket()
    .accounts({
      currentHolder: sender,
      recipient: params.recipient,
      event: params.eventPda,
      ticket: ticketPda,
      ticketMint: params.ticketMint,
      senderTokenAccount,
      recipientTokenAccount,
      mintAuthority,
    })
    .rpc();

  return tx;
}

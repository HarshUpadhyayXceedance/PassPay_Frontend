import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findTicketPda, findTreasuryPda } from "../pda";
import { findMintAuthorityPda, getAssociatedTokenAddress } from "../utils/tokenUtils";

export interface RefundTicketParams {
  eventPda: PublicKey;
  ticketMint: PublicKey;
}

export async function refundTicket(
  provider: AnchorProvider,
  params: RefundTicketParams
): Promise<string> {
  const program = getProgram(provider);
  const holder = provider.wallet.publicKey;
  const [ticketPda] = findTicketPda(params.eventPda, params.ticketMint);
  const [treasuryPda] = findTreasuryPda(params.eventPda);
  const [mintAuthority] = findMintAuthorityPda();
  const holderTokenAccount = getAssociatedTokenAddress(params.ticketMint, holder);

  const tx = await program.methods
    .refundTicket()
    .accounts({
      holder,
      event: params.eventPda,
      treasury: treasuryPda,
      ticket: ticketPda,
      ticketMint: params.ticketMint,
      mintAuthority,
      holderTokenAccount,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

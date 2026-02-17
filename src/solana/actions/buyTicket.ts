import {
  PublicKey,
  SystemProgram,
  Keypair,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import {
  findEventPda,
  findTicketPda,
  findTreasuryPda,
  findUserAttendancePda,
} from "../pda";
import {
  findMintAuthorityPda,
  findCollectionMintPda,
  findMetadataPda,
  findMasterEditionPda,
  getAssociatedTokenAddress,
} from "../utils/tokenUtils";
import { TOKEN_METADATA_PROGRAM_ID } from "../config/constants";

export interface BuyTicketParams {
  eventPda: PublicKey;
  metadataUri: string;
}

export async function buyTicket(
  provider: AnchorProvider,
  params: BuyTicketParams
): Promise<{ signature: string; mint: PublicKey }> {
  const program = getProgram(provider);
  const buyer = provider.wallet.publicKey;

  const ticketMint = Keypair.generate();
  const [ticketPda] = findTicketPda(params.eventPda, ticketMint.publicKey);
  const [treasuryPda] = findTreasuryPda(params.eventPda);
  const [mintAuthority] = findMintAuthorityPda();
  const [ticketMetadata] = findMetadataPda(ticketMint.publicKey);

  const buyerTokenAccount = getAssociatedTokenAddress(
    ticketMint.publicKey,
    buyer
  );

  const [collectionMint] = findCollectionMintPda(params.eventPda);
  const [collectionMetadata] = findMetadataPda(collectionMint);
  const [collectionMasterEdition] = findMasterEditionPda(collectionMint);
  const [userAttendanceRecord] = findUserAttendancePda(buyer);

  const tx = await program.methods
    .buyTicket({ metadataUri: params.metadataUri })
    .accounts({
      buyer,
      event: params.eventPda,
      treasury: treasuryPda,
      ticketMint: ticketMint.publicKey,
      mintAuthority,
      buyerTokenAccount,
      ticket: ticketPda,
      metadataAccount: ticketMetadata,
      collectionMint,
      collectionMetadata,
      collectionMasterEdition,
      userAttendanceRecord,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([ticketMint])
    .rpc();

  return { signature: tx, mint: ticketMint.publicKey };
}

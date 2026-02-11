import {
  PublicKey,
  SystemProgram,
  Keypair,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findEventPda, findTicketPda, findTreasuryPda } from "../pda";
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

  const tx = await program.methods
    .buyTicket({ metadataUri: params.metadataUri })
    .accounts({
      buyer,
      event: params.eventPda,
      ticket: ticketPda,
      ticketMint: ticketMint.publicKey,
      ticketMetadata,
      buyerTokenAccount,
      treasury: treasuryPda,
      mintAuthority,
      collectionMint,
      collectionMetadata,
      collectionMasterEdition,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([ticketMint])
    .rpc();

  return { signature: tx, mint: ticketMint.publicKey };
}

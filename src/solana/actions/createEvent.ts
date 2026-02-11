import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda, findEventPda, findTreasuryPda } from "../pda";
import {
  findMintAuthorityPda,
  findCollectionMintPda,
  findMetadataPda,
  findMasterEditionPda,
  getAssociatedTokenAddress,
} from "../utils/tokenUtils";
import { TOKEN_METADATA_PROGRAM_ID } from "../config/constants";

export interface CreateEventParams {
  name: string;
  venue: string;
  eventDate: Date;
  ticketPrice: number; // in SOL
  totalSeats: number;
  metadataUri: string;
}

export async function createEvent(
  provider: AnchorProvider,
  params: CreateEventParams
): Promise<string> {
  const program = getProgram(provider);
  const adminKey = provider.wallet.publicKey;

  const [adminPda] = findAdminPda(adminKey);
  const [eventPda] = findEventPda(adminKey, params.name);
  const [treasuryPda] = findTreasuryPda(eventPda);
  const [mintAuthority] = findMintAuthorityPda();
  const [collectionMint] = findCollectionMintPda(eventPda);
  const [collectionMetadata] = findMetadataPda(collectionMint);
  const [collectionMasterEdition] = findMasterEditionPda(collectionMint);
  const collectionTokenAccount = getAssociatedTokenAddress(
    collectionMint,
    mintAuthority
  );

  const ticketPriceLamports = new BN(
    Math.round(params.ticketPrice * 1_000_000_000)
  );

  const tx = await program.methods
    .createEvent({
      name: params.name,
      venue: params.venue,
      eventDate: new BN(Math.floor(params.eventDate.getTime() / 1000)),
      ticketPrice: ticketPriceLamports,
      totalSeats: params.totalSeats,
      metadataUri: params.metadataUri,
    })
    .accounts({
      adminAuthority: adminKey,
      admin: adminPda,
      event: eventPda,
      treasury: treasuryPda,
      collectionMint,
      collectionMetadata,
      collectionMasterEdition,
      collectionTokenAccount,
      mintAuthority,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

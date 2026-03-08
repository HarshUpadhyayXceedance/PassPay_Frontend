import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findAdminPda, findEventPda, findEscrowPda, findEscrowVaultPda } from "../pda";
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
  description: string;
  imageUrl?: string;
  eventDate: Date;
  ticketPrice: number;
  totalSeats: number;
  metadataUri: string;
  refundWindowHours?: number;
  isOnline?: boolean;
}

export async function createEvent(
  provider: AnchorProvider,
  params: CreateEventParams
): Promise<string> {
  const program = getProgram(provider);
  const adminKey = provider.wallet.publicKey;

  const [adminPda] = findAdminPda(adminKey);
  const [eventPda] = findEventPda(adminKey, params.name);
  const [escrowPda] = findEscrowPda(eventPda);
  const [escrowVaultPda] = findEscrowVaultPda(eventPda);
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
      description: params.description,
      imageUrl: params.imageUrl ?? "",
      eventDate: new BN(Math.floor(params.eventDate.getTime() / 1000)),
      ticketPrice: ticketPriceLamports,
      totalSeats: params.totalSeats,
      metadataUri: params.metadataUri,
      refundWindowHours: params.refundWindowHours ?? 48,
      isOnline: params.isOnline ?? false,
    })
    .accounts({
      adminAuthority: adminKey,
      admin: adminPda,
      event: eventPda,
      eventEscrow: escrowPda,
      escrowVault: escrowVaultPda,
      collectionMint,
      mintAuthority,
      collectionTokenAccount,
      collectionMetadata,
      collectionMasterEdition,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
    })
    .rpc();

  return tx;
}

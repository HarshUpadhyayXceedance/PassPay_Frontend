import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Connection,
  Transaction,
} from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { DEVNET_RPC } from "../config/constants";
import { phantomWalletAdapter } from "../wallet/phantomWalletAdapter";

export interface InitializeBadgeCollectionParams {
  collectionName: string;
  collectionSymbol: string;
  collectionUri: string;
  bronzeBadgeMint: PublicKey;
  silverBadgeMint: PublicKey;
  goldBadgeMint: PublicKey;
  platinumBadgeMint: PublicKey;
}

/**
 * Initialize the global badge collection (SuperAdmin only, one-time setup)
 *
 * @param superAdminPubkey - The SuperAdmin's public key (signer)
 * @param params - Badge collection parameters
 * @returns Transaction signature
 */
export async function initializeBadgeCollection(
  superAdminPubkey: PublicKey,
  params: InitializeBadgeCollectionParams
): Promise<string> {
  const connection = new Connection(DEVNET_RPC, "confirmed");

  // Create a wallet wrapper for the phantom adapter
  const wallet: Wallet = {
    publicKey: superAdminPubkey,
    signTransaction: async (tx: Transaction) => {
      return await phantomWalletAdapter.signTransaction(tx);
    },
    signAllTransactions: async (txs: Transaction[]) => {
      return await phantomWalletAdapter.signAllTransactions(txs);
    },
  };

  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const program = getProgram(provider);

  // Derive badge_collection PDA (seeds: ["badge_authority"])
  const [badgeCollectionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("badge_authority")],
    program.programId
  );

  const tx = await program.methods
    .initializeBadgeCollection({
      collectionName: params.collectionName,
      collectionSymbol: params.collectionSymbol,
      collectionUri: params.collectionUri,
    })
    .accounts({
      authority: superAdminPubkey,
      badgeCollection: badgeCollectionPda,
      bronzeBadgeMint: params.bronzeBadgeMint,
      silverBadgeMint: params.silverBadgeMint,
      goldBadgeMint: params.goldBadgeMint,
      platinumBadgeMint: params.platinumBadgeMint,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  return tx;
}

import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Keypair,
  Transaction,
} from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getProgram } from "../config/program";
import { findBadgeCollectionPda } from "../pda";
import { PROGRAM_ID } from "../config/constants";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

// SPL Token InitializeMint instruction layout
// https://github.com/solana-labs/solana-program-library/blob/master/token/program/src/instruction.rs
const MINT_SIZE = 82; // Mint account size

export interface InitializeBadgeCollectionParams {
  collectionName: string;
  collectionSymbol: string;
  collectionUri: string;
}

/**
 * Create 4 SPL token mints for badge tiers.
 * Each mint has badge_authority PDA as mint+freeze authority (so the program can CPI mint/freeze).
 * Uses the same Keypair+MWA pattern as buyTicket.
 */
export async function createBadgeMints(
  provider: AnchorProvider
): Promise<{
  bronzeMint: PublicKey;
  silverMint: PublicKey;
  goldMint: PublicKey;
  platinumMint: PublicKey;
}> {
  const payer = provider.wallet.publicKey;
  const connection = provider.connection;

  // badge_authority PDA is the mint+freeze authority for all badge mints
  const [badgeAuthorityPda] = findBadgeCollectionPda();

  // Generate 4 Keypairs for the mint accounts
  const bronzeKeypair = Keypair.generate();
  const silverKeypair = Keypair.generate();
  const goldKeypair = Keypair.generate();
  const platinumKeypair = Keypair.generate();

  const mintKeypairs = [bronzeKeypair, silverKeypair, goldKeypair, platinumKeypair];

  // Get rent exemption for mint accounts
  const rentExemption = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  // Build transaction with createAccount + initializeMint for each mint
  const tx = new Transaction();

  for (const kp of mintKeypairs) {
    // 1. Create the account
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: kp.publicKey,
        space: MINT_SIZE,
        lamports: rentExemption,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // 2. Initialize as mint (decimals=0, authority=badge_authority PDA)
    // InitializeMint instruction: index 0, decimals, mintAuthority, freezeAuthority
    const data = Buffer.alloc(67);
    data.writeUInt8(0, 0); // instruction index: InitializeMint
    data.writeUInt8(0, 1); // decimals: 0
    badgeAuthorityPda.toBuffer().copy(data, 2); // mintAuthority (32 bytes)
    data.writeUInt8(1, 34); // COption<Pubkey> tag: Some
    badgeAuthorityPda.toBuffer().copy(data, 35); // freezeAuthority (32 bytes)

    tx.add({
      keys: [
        { pubkey: kp.publicKey, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      programId: TOKEN_PROGRAM_ID,
      data,
    });
  }

  // Set tx properties
  tx.feePayer = payer;
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  // Step 1: Send to Phantom for signing (unsigned)
  const signedTx = await provider.wallet.signTransaction(tx);

  // Step 2: Add all 4 keypair signatures locally
  for (const kp of mintKeypairs) {
    signedTx.partialSign(kp);
  }

  // Step 3: Send raw transaction
  const signature = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  return {
    bronzeMint: bronzeKeypair.publicKey,
    silverMint: silverKeypair.publicKey,
    goldMint: goldKeypair.publicKey,
    platinumMint: platinumKeypair.publicKey,
  };
}

/**
 * Initialize the global badge collection (SuperAdmin only, one-time setup).
 * Call createBadgeMints() first to create the 4 tier mints.
 */
export async function initializeBadgeCollection(
  provider: AnchorProvider,
  params: InitializeBadgeCollectionParams & {
    bronzeBadgeMint: PublicKey;
    silverBadgeMint: PublicKey;
    goldBadgeMint: PublicKey;
    platinumBadgeMint: PublicKey;
  }
): Promise<string> {
  const program = getProgram(provider);
  const authority = provider.wallet.publicKey;

  const [badgeCollectionPda] = findBadgeCollectionPda();

  const tx = await program.methods
    .initializeBadgeCollection({
      collectionName: params.collectionName,
      collectionSymbol: params.collectionSymbol,
      collectionUri: params.collectionUri,
    })
    .accounts({
      authority,
      superAdminCheck: authority, // UncheckedAccount — constraint checks authority key
      badgeCollection: badgeCollectionPda,
      bronzeBadgeMint: params.bronzeBadgeMint,
      silverBadgeMint: params.silverBadgeMint,
      goldBadgeMint: params.goldBadgeMint,
      platinumBadgeMint: params.platinumBadgeMint,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  return tx;
}

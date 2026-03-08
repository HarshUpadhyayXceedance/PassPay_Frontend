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

const MINT_SIZE = 82;

export interface InitializeBadgeCollectionParams {
  collectionName: string;
  collectionSymbol: string;
  collectionUri: string;
}

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

  const [badgeAuthorityPda] = findBadgeCollectionPda();

  const bronzeKeypair = Keypair.generate();
  const silverKeypair = Keypair.generate();
  const goldKeypair = Keypair.generate();
  const platinumKeypair = Keypair.generate();

  const mintKeypairs = [bronzeKeypair, silverKeypair, goldKeypair, platinumKeypair];

  const rentExemption = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  const tx = new Transaction();

  for (const kp of mintKeypairs) {
    tx.add(
      SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: kp.publicKey,
        space: MINT_SIZE,
        lamports: rentExemption,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    const data = Buffer.alloc(67);
    data.writeUInt8(0, 0);
    data.writeUInt8(0, 1);
    badgeAuthorityPda.toBuffer().copy(data, 2);
    data.writeUInt8(1, 34);
    badgeAuthorityPda.toBuffer().copy(data, 35);

    tx.add({
      keys: [
        { pubkey: kp.publicKey, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      programId: TOKEN_PROGRAM_ID,
      data,
    });
  }

  tx.feePayer = payer;
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  const signedTx = await provider.wallet.signTransaction(tx);

  for (const kp of mintKeypairs) {
    signedTx.partialSign(kp);
  }

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
      superAdminCheck: authority,
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

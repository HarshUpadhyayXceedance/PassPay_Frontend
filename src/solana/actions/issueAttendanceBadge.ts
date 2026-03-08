import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Connection,
} from "@solana/web3.js";
import { getProgram } from "../config/program";
import { phantomWalletAdapter } from "../wallet/phantomWalletAdapter";
import { createProvider } from "../wallet/walletSession";
import { findUserAttendancePda, findBadgeCollectionPda } from "../pda";
import { getAssociatedTokenAddress } from "../utils/tokenUtils";
import { DEVNET_RPC } from "../config/constants";
import { BadgeTier } from "../../types/loyalty";

function tierFromU8(value: number): BadgeTier {
  switch (value) {
    case 0: return BadgeTier.None;
    case 1: return BadgeTier.Bronze;
    case 2: return BadgeTier.Silver;
    case 3: return BadgeTier.Gold;
    case 4: return BadgeTier.Platinum;
    default: return BadgeTier.None;
  }
}

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

export async function claimBadge(): Promise<{
  signature: string;
  badgeMint: string;
  tier: BadgeTier;
}> {
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const provider = createProvider(phantomWalletAdapter, connection);
  const program = getProgram(provider);

  const wallet = phantomWalletAdapter.getPublicKey();
  if (!wallet) throw new Error("Wallet not connected");

  const userPubkey = wallet;

  const [userAttendancePda] = findUserAttendancePda(userPubkey);
  const [badgeCollectionPda] = findBadgeCollectionPda();

  const accountInfo = await connection.getAccountInfo(userAttendancePda);
  if (!accountInfo || !accountInfo.data) {
    throw new Error("No attendance record found. Check in to an event first.");
  }

  const tierByte = new Uint8Array(accountInfo.data)[44];
  const currentTier = tierFromU8(tierByte);
  if (currentTier === BadgeTier.None) {
    throw new Error(
      "No badge earned yet. Attend more events to earn a tier."
    );
  }

  const badgeCollection = await program.account.badgeCollection.fetch(
    badgeCollectionPda
  );

  let badgeMint: PublicKey;
  switch (currentTier) {
    case BadgeTier.Bronze:
      badgeMint = badgeCollection.bronzeBadgeMint;
      break;
    case BadgeTier.Silver:
      badgeMint = badgeCollection.silverBadgeMint;
      break;
    case BadgeTier.Gold:
      badgeMint = badgeCollection.goldBadgeMint;
      break;
    case BadgeTier.Platinum:
      badgeMint = badgeCollection.platinumBadgeMint;
      break;
    default:
      throw new Error("Unknown tier");
  }

  const userBadgeTokenAccount = getAssociatedTokenAddress(badgeMint, userPubkey);

  const tx = await program.methods
    .issueAttendanceBadge()
    .accounts({
      user: userPubkey,
      userAttendanceRecord: userAttendancePda,
      badgeCollection: badgeCollectionPda,
      badgeMint,
      userBadgeTokenAccount,
      badgeAuthority: badgeCollectionPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  return {
    signature: tx,
    badgeMint: badgeMint.toBase58(),
    tier: currentTier,
  };
}

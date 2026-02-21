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

/** Convert raw u8 tier value to BadgeTier enum */
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

/**
 * Claim a soulbound badge NFT for the user's current tier.
 *
 * Prerequisites:
 *   1. User must have been checked in (attendance record exists)
 *   2. Badge collection must be initialized (admin one-time setup)
 *   3. User's current tier must be > None
 *   4. User must not already hold a badge for this tier
 *
 * The USER signs this transaction (not the admin).
 */
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

  // Derive PDAs
  const [userAttendancePda] = findUserAttendancePda(userPubkey);
  const [badgeCollectionPda] = findBadgeCollectionPda();

  // Fetch user attendance raw bytes to determine tier
  // (bypass Anchor BorshCoder — #[repr(u8)] enum causes "variant mismatch")
  const accountInfo = await connection.getAccountInfo(userAttendancePda);
  if (!accountInfo || !accountInfo.data) {
    throw new Error("No attendance record found. Check in to an event first.");
  }

  // current_tier is at byte offset 44 (after 8 disc + 32 user + 4 total_events)
  const tierByte = new Uint8Array(accountInfo.data)[44];
  const currentTier = tierFromU8(tierByte);
  if (currentTier === BadgeTier.None) {
    throw new Error(
      "No badge earned yet. Attend more events to earn a tier."
    );
  }

  // Fetch badge collection to get the correct mint for this tier
  const badgeCollection = await program.account.badgeCollection.fetch(
    badgeCollectionPda
  );

  // Get the correct badge mint for the user's tier
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

  // Derive user's ATA for this badge mint
  const userBadgeTokenAccount = getAssociatedTokenAddress(badgeMint, userPubkey);

  // Call the on-chain instruction (no args — pure claim)
  const tx = await program.methods
    .issueAttendanceBadge()
    .accounts({
      user: userPubkey,
      userAttendanceRecord: userAttendancePda,
      badgeCollection: badgeCollectionPda,
      badgeMint,
      userBadgeTokenAccount,
      badgeAuthority: badgeCollectionPda, // same PDA address, different role
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

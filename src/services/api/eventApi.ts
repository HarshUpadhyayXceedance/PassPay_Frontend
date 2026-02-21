import { PublicKey } from "@solana/web3.js";
import { getProgram } from "../../solana/config/program";
import { createProvider } from "../../solana/wallet/walletSession";
import { phantomWalletAdapter } from "../../solana/wallet/phantomWalletAdapter";
import { createEvent, CreateEventParams } from "../../solana/actions/createEvent";
import { buyTicket, BuyTicketParams } from "../../solana/actions/buyTicket";
import { checkIn, CheckInParams } from "../../solana/actions/checkIn";
import { transferTicket } from "../../solana/actions/transferTicket";
import { refundTicket } from "../../solana/actions/refundTicket";
import { withdrawFunds } from "../../solana/actions/withdrawFunds";
import { createAdmin } from "../../solana/actions/createAdmin";
import { claimBadge } from "../../solana/actions/issueAttendanceBadge";
import { createBadgeMints, initializeBadgeCollection } from "../../solana/actions/initializeBadgeCollection";
import { findAdminPda } from "../../solana/pda";
import { SUPER_ADMIN_PUBKEY } from "../../solana/config/constants";
import { BadgeTier } from "../../types/loyalty";

// Dev SuperAdmin public key (must match roleDetection.ts)
const DEV_SUPER_ADMIN_PUBKEY = new PublicKey(
  "24PNhTaNtomHhoy3fTRaMhAFCRj4uHqhZEEoWrKDbR5p"
);

/**
 * Ensure the admin PDA exists for the connected wallet.
 * If the wallet is a super_admin without an on-chain admin PDA,
 * auto-create one so they can create events.
 */
async function ensureAdminPda(provider: ReturnType<typeof createProvider>): Promise<void> {
  const walletKey = provider.wallet.publicKey;
  const program = getProgram(provider);
  const [adminPda] = findAdminPda(walletKey);

  const existing = await program.account.admin.fetchNullable(adminPda);
  if (existing) return; // Already initialized

  // Only auto-create for super_admin wallets
  const isSuperAdmin =
    walletKey.equals(SUPER_ADMIN_PUBKEY) ||
    walletKey.equals(DEV_SUPER_ADMIN_PUBKEY);

  if (!isSuperAdmin) {
    throw new Error(
      "Your admin account is not initialized. Contact a super admin to set up your admin access."
    );
  }

  console.log("🔧 Auto-initializing admin PDA for super_admin...");
  await createAdmin(walletKey, walletKey, "Super Admin");
  console.log("✅ Admin PDA initialized for super_admin");
}

export async function apiCreateEvent(params: CreateEventParams): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);

  // Ensure admin PDA exists before creating event
  await ensureAdminPda(provider);

  return createEvent(provider, params);
}

export async function apiBuyTicket(
  eventPda: string,
  metadataUri: string
): Promise<{ signature: string; mint: string }> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  const result = await buyTicket(provider, {
    eventPda: new PublicKey(eventPda),
    metadataUri,
  });
  return {
    signature: result.signature,
    mint: result.mint.toBase58(),
  };
}

export async function apiCheckIn(params: {
  eventPda: string;
  ticketMint: string;
  holderTokenAccount: string;
  ticketHolder: string;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return checkIn(provider, {
    eventPda: new PublicKey(params.eventPda),
    ticketMint: new PublicKey(params.ticketMint),
    holderTokenAccount: new PublicKey(params.holderTokenAccount),
    ticketHolder: new PublicKey(params.ticketHolder),
  });
}

export async function apiTransferTicket(params: {
  eventPda: string;
  ticketMint: string;
  recipient: string;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return transferTicket(provider, {
    eventPda: new PublicKey(params.eventPda),
    ticketMint: new PublicKey(params.ticketMint),
    recipient: new PublicKey(params.recipient),
  });
}

export async function apiRefundTicket(params: {
  eventPda: string;
  ticketMint: string;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return refundTicket(provider, {
    eventPda: new PublicKey(params.eventPda),
    ticketMint: new PublicKey(params.ticketMint),
  });
}

export async function apiWithdrawFunds(params: {
  eventPda: string;
  amount: number;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return withdrawFunds(provider, {
    eventPda: new PublicKey(params.eventPda),
    amount: params.amount,
  });
}

/**
 * User claims their soulbound badge NFT based on current attendance tier.
 */
export async function apiClaimBadge(): Promise<{
  signature: string;
  badgeMint: string;
  tier: BadgeTier;
}> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  return claimBadge();
}

/**
 * Admin one-time setup: create 4 tier mints and initialize badge collection.
 */
export async function apiSetupBadgeCollection(): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);

  // Step 1: Create 4 SPL mints with badge_authority PDA as authority
  const mints = await createBadgeMints(provider);

  // Step 2: Initialize badge collection on-chain
  const tx = await initializeBadgeCollection(provider, {
    collectionName: "PassPay Badges",
    collectionSymbol: "PPBADGE",
    collectionUri: "https://passpay.dev/badges/collection.json",
    bronzeBadgeMint: mints.bronzeMint,
    silverBadgeMint: mints.silverMint,
    goldBadgeMint: mints.goldMint,
    platinumBadgeMint: mints.platinumMint,
  });

  return tx;
}

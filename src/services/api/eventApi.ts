import { PublicKey } from "@solana/web3.js";
import { getProgram } from "../../solana/config/program";
import { createProvider } from "../../solana/wallet/walletSession";
import { phantomWalletAdapter } from "../../solana/wallet/phantomWalletAdapter";
import { createEvent, CreateEventParams } from "../../solana/actions/createEvent";
import { buyTicket, BuyTicketParams } from "../../solana/actions/buyTicket";
import { checkIn, CheckInParams } from "../../solana/actions/checkIn";
import { transferTicket } from "../../solana/actions/transferTicket";
import { requestRefund } from "../../solana/actions/requestRefund";
import { approveRefund } from "../../solana/actions/approveRefund";
import { rejectRefund } from "../../solana/actions/rejectRefund";
import { releaseFunds } from "../../solana/actions/releaseFunds";
import { cancelEvent } from "../../solana/actions/cancelEvent";
import { claimCancellationRefund } from "../../solana/actions/claimCancellationRefund";
import { addSeatTier } from "../../solana/actions/addSeatTier";
import { addProduct } from "../../solana/actions/addProduct";
import { updateProduct } from "../../solana/actions/updateProduct";
import { buyProduct } from "../../solana/actions/buyProduct";
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

  console.log("Auto-initializing admin PDA for super_admin...");
  await createAdmin(walletKey, walletKey, "Super Admin");
  console.log("Admin PDA initialized for super_admin");
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
  seatTierPda: string,
  metadataUri: string
): Promise<{ signature: string; mint: string }> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  const result = await buyTicket(provider, {
    eventPda: new PublicKey(eventPda),
    seatTierPda: new PublicKey(seatTierPda),
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

export async function apiRequestRefund(params: {
  eventPda: string;
  ticketMint: string;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return requestRefund(provider, {
    eventPda: new PublicKey(params.eventPda),
    ticketMint: new PublicKey(params.ticketMint),
  });
}

export async function apiApproveRefund(params: {
  eventPda: string;
  ticketMint: string;
  holder: string;
  seatTierPda: string;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return approveRefund(provider, {
    eventPda: new PublicKey(params.eventPda),
    ticketMint: new PublicKey(params.ticketMint),
    holder: new PublicKey(params.holder),
    seatTierPda: new PublicKey(params.seatTierPda),
  });
}

export async function apiRejectRefund(params: {
  eventPda: string;
  ticketMint: string;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return rejectRefund(provider, {
    eventPda: new PublicKey(params.eventPda),
    ticketMint: new PublicKey(params.ticketMint),
  });
}

export async function apiReleaseFunds(params: {
  eventPda: string;
  eventCreator: string;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return releaseFunds(provider, {
    eventPda: new PublicKey(params.eventPda),
    eventCreator: new PublicKey(params.eventCreator),
  });
}

export async function apiCancelEvent(params: {
  eventPda: string;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return cancelEvent(provider, {
    eventPda: new PublicKey(params.eventPda),
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

export async function apiClaimCancellationRefund(params: {
  eventPda: string;
  ticketMint: string;
  seatTierPda: string;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return claimCancellationRefund(provider, {
    eventPda: new PublicKey(params.eventPda),
    ticketMint: new PublicKey(params.ticketMint),
    seatTierPda: new PublicKey(params.seatTierPda),
  });
}

export async function apiAddSeatTier(params: {
  eventPda: string;
  name: string;
  price: number;
  totalSeats: number;
  tierLevel: number;
  isRestricted: boolean;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  await ensureAdminPda(provider);
  return addSeatTier(provider, {
    eventPda: new PublicKey(params.eventPda),
    name: params.name,
    price: params.price,
    totalSeats: params.totalSeats,
    tierLevel: params.tierLevel,
    isRestricted: params.isRestricted,
  });
}

export async function apiAddProduct(params: {
  eventPda: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return addProduct(provider, {
    eventPda: new PublicKey(params.eventPda),
    name: params.name,
    description: params.description,
    price: params.price,
    imageUrl: params.imageUrl,
  });
}

export async function apiUpdateProduct(params: {
  eventPda: string;
  productName: string;
  price?: number;
  description?: string;
  imageUrl?: string;
  isAvailable?: boolean;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return updateProduct(provider, {
    eventPda: new PublicKey(params.eventPda),
    productName: params.productName,
    price: params.price,
    description: params.description,
    imageUrl: params.imageUrl,
    isAvailable: params.isAvailable,
  });
}

export async function apiBuyProduct(params: {
  eventPda: string;
  merchantAuthority: string;
  productName: string;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return buyProduct(provider, {
    eventPda: new PublicKey(params.eventPda),
    merchantAuthority: new PublicKey(params.merchantAuthority),
    productName: params.productName,
  });
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

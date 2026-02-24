import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "5q8tkv9Rxccrpw1fhH68m8tW4k3iuLCiD4GTuRiWbrSb"
);

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const DEVNET_RPC = "https://api.devnet.solana.com";
export const MAINNET_RPC = "https://api.mainnet-beta.solana.com";

// SuperAdmin wallet (hardcoded - can only be set once during deployment)
export const SUPER_ADMIN_PUBKEY = new PublicKey(
  "LssxRdEeDV3fLd4y4m3akAPfz3HApTBw9yh7TJvFFhP"
);

// PDA seeds
export const ADMIN_SEED = "admin";
export const EVENT_SEED = "event";
export const TICKET_SEED = "ticket";
export const MERCHANT_SEED = "merchant";
export const ESCROW_SEED = "escrow";
export const ESCROW_VAULT_SEED = "escrow_vault";
export const REFUND_SEED = "refund";
export const MINT_AUTHORITY_SEED = "mint_authority";
export const COLLECTION_SEED = "collection";
export const ATTENDANCE_SEED = "attendance";
export const BADGE_AUTHORITY_SEED = "badge_authority";
export const SEAT_TIER_SEED = "seat_tier";
export const PRODUCT_SEED = "product";

// Limits
export const MAX_EVENT_NAME_LEN = 64;
export const MAX_VENUE_LEN = 128;
export const MAX_MERCHANT_NAME_LEN = 64;
export const MAX_EVENT_DESCRIPTION_LEN = 256;
export const MAX_MERCHANT_DESCRIPTION_LEN = 128;
export const MAX_METADATA_URI_LEN = 200;
export const MAX_IMAGE_URL_LEN = 200;

// SOL
export const LAMPORTS_PER_SOL = 1_000_000_000;

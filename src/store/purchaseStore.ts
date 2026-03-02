import { create } from "zustand";
import { Connection, PublicKey } from "@solana/web3.js";
import { utils } from "@coral-xyz/anchor";
import { DEVNET_RPC, PROGRAM_ID } from "../solana/config/constants";
import { lamportsToSOL } from "../utils/formatters";

/**
 * ProductPurchase on-chain account layout (130 bytes total):
 *   disc(8) + buyer(32) + product(32) + merchant(32)
 *   + amount(8) + is_collected(1) + purchased_at(8) + collected_at(8) + bump(1)
 */
const PRODUCT_PURCHASE_DISC = new Uint8Array([63, 63, 31, 130, 199, 201, 162, 171]);

export interface ProductPurchaseDisplay {
  publicKey: string;
  buyer: string;
  product: string;
  merchant: string;
  amount: number; // in SOL
  amountLamports: number;
  isCollected: boolean;
  purchasedAt: number; // ms
  collectedAt: number; // ms (0 if not collected)
}

interface PurchaseState {
  purchases: ProductPurchaseDisplay[];
  isLoaded: boolean;
  isLoading: boolean;
  fetchPurchases: (buyerPublicKey: string) => Promise<void>;
}

function parseProductPurchase(
  pubkey: PublicKey,
  data: Buffer
): ProductPurchaseDisplay | null {
  if (data.length < 130) return null;

  let offset = 8; // skip discriminator

  const buyer = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const product = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  const merchant = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // amount: u64 (LE)
  const amountLow = data.readUInt32LE(offset);
  const amountHigh = data.readUInt32LE(offset + 4);
  const amountLamports = amountLow + amountHigh * 0x100000000;
  offset += 8;

  const isCollected = data[offset] !== 0;
  offset += 1;

  // purchased_at: i64 (LE)
  const purchasedAtLow = data.readUInt32LE(offset);
  const purchasedAtHigh = data.readInt32LE(offset + 4);
  const purchasedAtSec = purchasedAtLow + purchasedAtHigh * 0x100000000;
  offset += 8;

  // collected_at: i64 (LE)
  const collectedAtLow = data.readUInt32LE(offset);
  const collectedAtHigh = data.readInt32LE(offset + 4);
  const collectedAtSec = collectedAtLow + collectedAtHigh * 0x100000000;

  return {
    publicKey: pubkey.toBase58(),
    buyer: buyer.toBase58(),
    product: product.toBase58(),
    merchant: merchant.toBase58(),
    amount: lamportsToSOL(amountLamports),
    amountLamports,
    isCollected,
    purchasedAt: purchasedAtSec * 1000,
    collectedAt: collectedAtSec > 0 ? collectedAtSec * 1000 : 0,
  };
}

export const usePurchaseStore = create<PurchaseState>((set) => ({
  purchases: [],
  isLoaded: false,
  isLoading: false,

  fetchPurchases: async (buyerPublicKey: string) => {
    set({ isLoading: true });
    try {
      const connection = new Connection(DEVNET_RPC, "confirmed");
      const buyerPubkey = new PublicKey(buyerPublicKey);

      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: utils.bytes.bs58.encode(PRODUCT_PURCHASE_DISC),
            },
          },
          {
            memcmp: {
              offset: 8, // buyer field starts right after discriminator
              bytes: buyerPubkey.toBase58(),
            },
          },
        ],
      });

      const purchases: ProductPurchaseDisplay[] = [];
      for (const { pubkey, account } of accounts) {
        try {
          const parsed = parseProductPurchase(pubkey, account.data as Buffer);
          if (parsed) purchases.push(parsed);
        } catch (e) {
          console.warn("Skipping ProductPurchase", pubkey.toBase58(), e);
        }
      }

      // Sort newest first
      purchases.sort((a, b) => b.purchasedAt - a.purchasedAt);

      set({ purchases, isLoaded: true, isLoading: false });
    } catch (error: any) {
      console.error("Failed to fetch purchases:", error.message);
      set({ isLoaded: true, isLoading: false });
    }
  },
}));

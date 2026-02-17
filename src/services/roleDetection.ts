import { PublicKey, Connection } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import PassPayIDL from "../solana/idl/passpay.json";
import {
  PROGRAM_ID,
  SUPER_ADMIN_PUBKEY,
  DEVNET_RPC,
} from "../solana/config/constants";
import { findAdminPda } from "../solana/pda/adminPda";
import { UserRole } from "../types/navigation";

// Dev SuperAdmin public key (from mock wallet adapter's fixed seed)
// This allows Expo Go testing with SuperAdmin role
const DEV_SUPER_ADMIN_PUBKEY = new PublicKey(
  "24PNhTaNtomHhoy3fTRaMhAFCRj4uHqhZEEoWrKDbR5p"
);

/**
 * Detect user role based on on-chain account lookup
 *
 * Priority order:
 * 1. SuperAdmin (hardcoded wallet check - production OR dev)
 * 2. Admin (has active Admin PDA)
 * 3. Merchant (has active Merchant PDA for any event)
 * 4. User (default)
 */
export async function detectUserRole(
  walletPublicKey: PublicKey,
  connection: Connection
): Promise<UserRole> {
  try {
    // Step 1: Check if wallet is the SuperAdmin (production or dev)
    if (
      walletPublicKey.equals(SUPER_ADMIN_PUBKEY) ||
      walletPublicKey.equals(DEV_SUPER_ADMIN_PUBKEY)
    ) {
      const isDev = walletPublicKey.equals(DEV_SUPER_ADMIN_PUBKEY);
      console.log(
        `✅ Role detected: super_admin (${isDev ? "dev mock wallet" : "production"})`
      );
      return "super_admin";
    }

    // Create a minimal provider for account fetching (no wallet needed for reads)
    const provider = new AnchorProvider(
      connection,
      {} as any, // We don't need a wallet for read-only operations
      { commitment: "confirmed" }
    );

    const program = new Program(
      PassPayIDL as any,
      provider
    );

    // Step 2: Check for Admin PDA
    try {
      const [adminPda] = findAdminPda(walletPublicKey);
      const adminAccount = await (program.account as any).admin.fetch(adminPda);

      if (adminAccount.isActive) {
        console.log("✅ Role detected: admin (active Admin PDA found)");
        return "admin";
      } else {
        console.log("⚠️ Admin PDA found but inactive, continuing checks...");
      }
    } catch (error: any) {
      // Admin PDA doesn't exist or fetch failed, this is normal
      if (!error.message?.includes("Account does not exist")) {
        console.warn("Error checking Admin PDA:", error.message);
      }
    }

    // Step 3: Check for Merchant PDAs
    // We need to fetch all Merchant accounts where authority = walletPublicKey
    try {
      const merchantAccounts = await (program.account as any).merchant.all([
        {
          memcmp: {
            offset: 8 + 32, // Skip discriminator (8) + event pubkey (32) to get to authority field
            bytes: walletPublicKey.toBase58(),
          },
        },
      ]);

      // Check if any merchant account is active
      const activeMerchant = merchantAccounts.find(
        (m: any) => m.account.isActive
      );

      if (activeMerchant) {
        console.log(
          "✅ Role detected: merchant (active Merchant PDA found)"
        );
        return "merchant";
      } else if (merchantAccounts.length > 0) {
        console.log(
          "⚠️ Merchant PDAs found but all inactive, defaulting to user role"
        );
      }
    } catch (error: any) {
      console.warn("Error checking Merchant PDAs:", error.message);
    }

    // Step 4: Default to user role
    console.log("✅ Role detected: user (no admin/merchant PDAs found)");
    return "user";
  } catch (error) {
    console.error("Fatal error in role detection:", error);
    // On error, default to user role for safety
    return "user";
  }
}

/**
 * Re-detect role after wallet connection or role changes
 * This should be called:
 * - After Phantom wallet connection
 * - After admin is deactivated (on next app open)
 * - Periodically if needed
 */
export async function refreshUserRole(
  walletPublicKey: PublicKey | null
): Promise<UserRole | null> {
  if (!walletPublicKey) {
    return null;
  }

  const connection = new Connection(DEVNET_RPC, "confirmed");
  return await detectUserRole(walletPublicKey, connection);
}

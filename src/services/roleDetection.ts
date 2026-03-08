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

const DEV_SUPER_ADMIN_PUBKEY = new PublicKey(
  "24PNhTaNtomHhoy3fTRaMhAFCRj4uHqhZEEoWrKDbR5p"
);

export async function detectUserRole(
  walletPublicKey: PublicKey,
  connection: Connection
): Promise<UserRole> {
  try {
    if (
      walletPublicKey.equals(SUPER_ADMIN_PUBKEY) ||
      walletPublicKey.equals(DEV_SUPER_ADMIN_PUBKEY)
    ) {
      const isDev = walletPublicKey.equals(DEV_SUPER_ADMIN_PUBKEY);
      console.log(
        `Role detected: super_admin (${isDev ? "dev mock wallet" : "production"})`
      );
      return "super_admin";
    }

    const provider = new AnchorProvider(
      connection,
      {} as any,
      { commitment: "confirmed" }
    );

    const program = new Program(
      PassPayIDL as any,
      provider
    );

    try {
      const [adminPda] = findAdminPda(walletPublicKey);
      const adminAccount = await (program.account as any).admin.fetch(adminPda);

      if (adminAccount.isActive) {
        console.log("Role detected: admin (active Admin PDA found)");
        return "admin";
      } else {
        console.log("Admin PDA found but inactive, continuing checks...");
      }
    } catch (error: any) {
      if (!error.message?.includes("Account does not exist")) {
        console.warn("Error checking Admin PDA:", error.message);
      }
    }

    try {
      const merchantAccounts = await (program.account as any).merchant.all([
        {
          memcmp: {
            offset: 8,
            bytes: walletPublicKey.toBase58(),
          },
        },
      ]);

      const activeMerchant = merchantAccounts.find(
        (m: any) => m.account.isActive
      );

      if (activeMerchant) {
        console.log(
          "Role detected: merchant (active Merchant PDA found)"
        );
        return "merchant";
      } else if (merchantAccounts.length > 0) {
        console.log(
          "Merchant PDAs found but all inactive, defaulting to user role"
        );
      }
    } catch (error: any) {
      console.warn("Error checking Merchant PDAs:", error.message);
    }

    console.log("Role detected: user (no admin/merchant PDAs found)");
    return "user";
  } catch (error) {
    console.error("Fatal error in role detection:", error);
    return "user";
  }
}

export async function refreshUserRole(
  walletPublicKey: PublicKey | null
): Promise<UserRole | null> {
  if (!walletPublicKey) {
    return null;
  }

  const connection = new Connection(DEVNET_RPC, "confirmed");
  return await detectUserRole(walletPublicKey, connection);
}

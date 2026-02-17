import { Connection, PublicKey } from "@solana/web3.js";
import { utils } from "@coral-xyz/anchor";
import { PROGRAM_ID } from "../config/constants";

/**
 * Account discriminators from the IDL (first 8 bytes of sha256("account:<Name>")).
 * Used to filter getProgramAccounts results by account type.
 */
const DISCRIMINATORS: Record<string, Uint8Array> = {
  Event: new Uint8Array([125, 192, 125, 158, 9, 115, 152, 233]),
  Merchant: new Uint8Array([71, 235, 30, 40, 231, 21, 32, 64]),
  Ticket: new Uint8Array([41, 228, 24, 165, 78, 90, 235, 200]),
  Admin: new Uint8Array([244, 158, 220, 65, 8, 73, 4, 65]),
};

/**
 * Fetches all on-chain accounts of a given type, skipping any that fail
 * deserialization (e.g. old-schema accounts missing newly-added fields).
 *
 * This replaces `program.account.<type>.all()` which throws if ANY account
 * has an incompatible schema, crashing the entire fetch.
 */
export async function safeFetchAll<T = any>(
  connection: Connection,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  program: any,
  accountName: "Event" | "Merchant" | "Ticket" | "Admin"
): Promise<{ publicKey: PublicKey; account: T }[]> {
  const discriminator = DISCRIMINATORS[accountName];
  if (!discriminator) {
    throw new Error(`Unknown account type: ${accountName}`);
  }

  const rawAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: utils.bytes.bs58.encode(discriminator),
        },
      },
    ],
  });

  // Anchor's BorshAccountsCoder stores layouts under camelCase keys
  // (e.g. "event" not "Event"), so convert for the decode call
  const decodeName =
    accountName.charAt(0).toLowerCase() + accountName.slice(1);

  const results: { publicKey: PublicKey; account: T }[] = [];
  for (const { pubkey, account } of rawAccounts) {
    try {
      const decoded = program.coder.accounts.decode(
        decodeName,
        account.data
      ) as T;
      results.push({ publicKey: pubkey, account: decoded });
    } catch (e) {
      console.warn(
        `Skipping ${accountName} account ${pubkey.toBase58()} (old schema):`,
        e
      );
    }
  }

  return results;
}

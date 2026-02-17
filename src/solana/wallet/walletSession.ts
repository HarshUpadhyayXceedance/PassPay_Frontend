import { AnchorProvider } from "@coral-xyz/anchor";
import {
  Connection,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { getConnection } from "../config/connection";
import { PhantomWalletAdapter } from "./phantomWalletAdapter";

export function createProvider(
  wallet: PhantomWalletAdapter,
  connection?: Connection
): AnchorProvider {
  const conn = connection ?? getConnection();
  const pubKey = wallet.getPublicKey();
  if (!pubKey) throw new Error("Wallet not connected");

  const anchorWallet = {
    publicKey: pubKey,
    signTransaction: async <T extends Transaction | VersionedTransaction>(
      tx: T
    ): Promise<T> =>
      (await wallet.signTransaction(tx as Transaction)) as unknown as T,
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(
      txs: T[]
    ): Promise<T[]> =>
      (await wallet.signAllTransactions(
        txs as Transaction[]
      )) as unknown as T[],
  };

  return new AnchorProvider(conn, anchorWallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
}

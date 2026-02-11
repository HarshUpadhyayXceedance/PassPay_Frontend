import { AnchorProvider } from "@coral-xyz/anchor";
import {
  Connection,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { getConnection } from "../config/connection";
import { LocalWalletAdapter } from "./walletAdapter";

export function createProvider(
  wallet: LocalWalletAdapter,
  connection?: Connection
): AnchorProvider {
  const conn = connection ?? getConnection();

  const anchorWallet = {
    publicKey: wallet.publicKey,
    signTransaction: <T extends Transaction | VersionedTransaction>(
      tx: T
    ): Promise<T> => wallet.signTransaction(tx),
    signAllTransactions: <T extends Transaction | VersionedTransaction>(
      txs: T[]
    ): Promise<T[]> => wallet.signAllTransactions(txs),
  };

  return new AnchorProvider(conn, anchorWallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
}

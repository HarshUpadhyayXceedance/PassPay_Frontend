import {
  Connection,
  Transaction,
  TransactionSignature,
  SendOptions,
} from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";

export async function sendAndConfirmTransaction(
  provider: AnchorProvider,
  tx: Transaction,
  options?: SendOptions
): Promise<TransactionSignature> {
  tx.recentBlockhash = (
    await provider.connection.getLatestBlockhash()
  ).blockhash;
  tx.feePayer = provider.wallet.publicKey;

  const signed = await provider.wallet.signTransaction(tx);
  const signature = await provider.connection.sendRawTransaction(
    signed.serialize(),
    options
  );

  await provider.connection.confirmTransaction(signature, "confirmed");
  return signature;
}

export async function getBalance(
  connection: Connection,
  publicKey: import("@solana/web3.js").PublicKey
): Promise<number> {
  const lamports = await connection.getBalance(publicKey);
  return lamports / 1_000_000_000;
}

export function shortenSignature(sig: string, chars = 8): string {
  return `${sig.slice(0, chars)}...${sig.slice(-chars)}`;
}

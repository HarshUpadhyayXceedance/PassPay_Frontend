import {
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import * as SecureStore from "expo-secure-store";
import { encode, decode } from "../utils/encoding";

const WALLET_KEY = "passpay_wallet_secret";

export interface WalletAdapter {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]>;
}

export class LocalWalletAdapter implements WalletAdapter {
  private keypair: Keypair;

  constructor(keypair: Keypair) {
    this.keypair = keypair;
  }

  get publicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    if (tx instanceof Transaction) {
      tx.partialSign(this.keypair);
    } else {
      tx.sign([this.keypair]);
    }
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> {
    return txs.map((tx) => {
      if (tx instanceof Transaction) {
        tx.partialSign(this.keypair);
      } else {
        tx.sign([this.keypair]);
      }
      return tx;
    });
  }

  getKeypair(): Keypair {
    return this.keypair;
  }
}

export async function createNewWallet(): Promise<LocalWalletAdapter> {
  const keypair = Keypair.generate();
  await SecureStore.setItemAsync(
    WALLET_KEY,
    encode(keypair.secretKey)
  );
  return new LocalWalletAdapter(keypair);
}

export async function loadWallet(): Promise<LocalWalletAdapter | null> {
  const stored = await SecureStore.getItemAsync(WALLET_KEY);
  if (!stored) return null;
  const secretKey = decode(stored);
  const keypair = Keypair.fromSecretKey(secretKey);
  return new LocalWalletAdapter(keypair);
}

export async function deleteWallet(): Promise<void> {
  await SecureStore.deleteItemAsync(WALLET_KEY);
}

export async function hasStoredWallet(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(WALLET_KEY);
  return stored !== null;
}

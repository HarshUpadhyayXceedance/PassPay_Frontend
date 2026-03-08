import { PublicKey, Keypair, Transaction } from "@solana/web3.js";
import * as SecureStore from "expo-secure-store";

const DEV_SUPERADMIN_SEED = new Uint8Array([
  174, 47, 154, 16, 202, 193, 206, 113, 199, 190, 53, 133, 169, 175, 31, 56,
  222, 53, 138, 189, 224, 216, 117, 173, 10, 149, 53, 45, 73, 251, 237, 246,
]);

export interface MockWalletAdapter {
  connect: () => Promise<PublicKey>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (
    transactions: Transaction[]
  ) => Promise<Transaction[]>;
  signAndSendTransaction: (
    transaction: Transaction
  ) => Promise<{ signature: string }>;
  getPublicKey: () => PublicKey | null;
}

class MockWalletAdapterImpl implements MockWalletAdapter {
  private keypair: Keypair | null = null;

  async connect(): Promise<PublicKey> {
    console.log("Using Mock Wallet Adapter (Development Mode)");

    this.keypair = Keypair.fromSeed(DEV_SUPERADMIN_SEED);

    console.log("Dev SuperAdmin wallet connected:", this.keypair.publicKey.toBase58());
    console.log("This wallet will be auto-detected as SuperAdmin in dev mode");

    await new Promise((resolve) => setTimeout(resolve, 500));

    return this.keypair.publicKey;
  }

  async disconnect(): Promise<void> {
    this.keypair = null;
    console.log("Dev SuperAdmin wallet disconnected");
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.keypair) {
      throw new Error("Mock wallet not connected");
    }

    transaction.partialSign(this.keypair);
    console.log("Transaction signed with mock wallet");
    return transaction;
  }

  async signAllTransactions(
    transactions: Transaction[]
  ): Promise<Transaction[]> {
    if (!this.keypair) {
      throw new Error("Mock wallet not connected");
    }

    const signedTxs = transactions.map((tx) => {
      tx.partialSign(this.keypair!);
      return tx;
    });

    console.log(`${transactions.length} transactions signed with mock wallet`);
    return signedTxs;
  }

  async signAndSendTransaction(
    transaction: Transaction
  ): Promise<{ signature: string }> {
    if (!this.keypair) {
      throw new Error("Mock wallet not connected");
    }

    const fakeSignature = "mock_" + Math.random().toString(36).substring(7);
    console.log("Mock transaction sent:", fakeSignature);

    return { signature: fakeSignature };
  }

  getPublicKey(): PublicKey | null {
    return this.keypair?.publicKey || null;
  }
}

export const mockWalletAdapter = new MockWalletAdapterImpl();

import { Linking } from "react-native";
import { PublicKey, Transaction } from "@solana/web3.js";
import Constants from "expo-constants";
import { mockWalletAdapter } from "./mockWalletAdapter";

export interface PhantomWalletAdapter {
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

/**
 * Phantom Wallet Adapter with Development Mode Support
 *
 * - In Expo Go / Development: Uses mock wallet adapter (no native modules required)
 * - In Production Build: Uses real Phantom Mobile Wallet Adapter (Solana Mobile Stack)
 *
 * This allows development in Expo Go while preserving production Phantom integration.
 */
class PhantomWalletAdapterImpl implements PhantomWalletAdapter {
  private publicKey: PublicKey | null = null;
  private isDevelopment: boolean;

  constructor() {
    // Use real Phantom wallet (requires expo-dev-client or custom build)
    // Set to true to use mock wallet for Expo Go testing
    this.isDevelopment = true; // Set to true for Expo Go development

    if (this.isDevelopment) {
      console.log("🔧 Development Mode: Using Mock Wallet Adapter (Expo Go)");
      console.log("💡 Mock wallet configured as SuperAdmin for testing");
    } else {
      console.log("🚀 Production Mode: Using Real Phantom Wallet");
    }
  }

  async connect(): Promise<PublicKey> {
    if (this.isDevelopment) {
      // Use mock adapter in development
      this.publicKey = await mockWalletAdapter.connect();
      return this.publicKey;
    }

    // Production: Use real Phantom Mobile Wallet Adapter
    try {
      // Dynamic import to avoid loading native modules in Expo Go
      const { transact, Web3MobileWallet } = await import(
        "@solana-mobile/mobile-wallet-adapter-protocol-web3js"
      );

      const authorizationResult = await transact(
        async (wallet: typeof Web3MobileWallet) => {
          const authorization = await wallet.authorize({
            cluster: "devnet",
            identity: {
              name: "PassPay",
              uri: "https://passpay.app",
              icon: "favicon.ico",
            },
          });
          return authorization;
        }
      );

      if (!authorizationResult || !authorizationResult.accounts || authorizationResult.accounts.length === 0) {
        throw new Error("No wallet found. Please install Phantom wallet.");
      }

      // The publicKey is already a PublicKey object from the accounts array
      this.publicKey = authorizationResult.accounts[0].publicKey;
      console.log("✅ Connected to Phantom wallet:", this.publicKey.toBase58());

      return this.publicKey;
    } catch (error: any) {
      console.error("Failed to connect to Phantom:", error);

      // If wallet not found, open Phantom website
      if (error.message?.includes("No wallet")) {
        await Linking.openURL("https://phantom.app/download");
      }

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isDevelopment) {
      await mockWalletAdapter.disconnect();
      this.publicKey = null;
      return;
    }

    // Production: Disconnect from Phantom
    try {
      const { transact, Web3MobileWallet } = await import(
        "@solana-mobile/mobile-wallet-adapter-protocol-web3js"
      );

      await transact(async (wallet: typeof Web3MobileWallet) => {
        await wallet.deauthorize({
          auth_token: "",
        });
      });

      this.publicKey = null;
      console.log("✅ Disconnected from Phantom wallet");
    } catch (error) {
      console.error("Failed to disconnect:", error);
      this.publicKey = null;
    }
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (this.isDevelopment) {
      return await mockWalletAdapter.signTransaction(transaction);
    }

    if (!this.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Production: Sign with Phantom
    const { transact, Web3MobileWallet } = await import(
      "@solana-mobile/mobile-wallet-adapter-protocol-web3js"
    );

    const signedTransactions = await transact(
      async (wallet: typeof Web3MobileWallet) => {
        // Re-authorize for signing (required by protocol)
        await wallet.authorize({
          cluster: "devnet",
          identity: {
            name: "PassPay",
            uri: "https://passpay.app",
            icon: "favicon.ico",
          },
        });

        // Sign the transaction
        const signedTxs = await wallet.signTransactions({
          transactions: [transaction],
        });

        return signedTxs;
      }
    );

    return signedTransactions[0];
  }

  async signAllTransactions(
    transactions: Transaction[]
  ): Promise<Transaction[]> {
    if (this.isDevelopment) {
      return await mockWalletAdapter.signAllTransactions(transactions);
    }

    if (!this.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Production: Sign with Phantom
    const { transact, Web3MobileWallet } = await import(
      "@solana-mobile/mobile-wallet-adapter-protocol-web3js"
    );

    const signedTransactions = await transact(
      async (wallet: typeof Web3MobileWallet) => {
        // Re-authorize for signing (required by protocol)
        await wallet.authorize({
          cluster: "devnet",
          identity: {
            name: "PassPay",
            uri: "https://passpay.app",
            icon: "favicon.ico",
          },
        });

        // Sign all transactions
        const signedTxs = await wallet.signTransactions({
          transactions: transactions,
        });

        return signedTxs;
      }
    );

    return signedTransactions;
  }

  async signAndSendTransaction(
    transaction: Transaction
  ): Promise<{ signature: string }> {
    if (this.isDevelopment) {
      return await mockWalletAdapter.signAndSendTransaction(transaction);
    }

    if (!this.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Production: Sign and send with Phantom
    const { transact, Web3MobileWallet } = await import(
      "@solana-mobile/mobile-wallet-adapter-protocol-web3js"
    );

    const result = await transact(async (wallet: typeof Web3MobileWallet) => {
      // Re-authorize for signing and sending (required by protocol)
      await wallet.authorize({
        cluster: "devnet",
        identity: {
          name: "PassPay",
          uri: "https://passpay.app",
          icon: "favicon.ico",
        },
      });

      // Sign and send the transaction
      const signedTxs = await wallet.signAndSendTransactions({
        transactions: [transaction],
      });

      return signedTxs;
    });

    // Extract signature from result
    const signature = result[0];
    console.log("✅ Transaction sent:", signature);

    return { signature: Buffer.from(signature).toString('base64') };
  }

  getPublicKey(): PublicKey | null {
    if (this.isDevelopment) {
      return mockWalletAdapter.getPublicKey();
    }
    return this.publicKey;
  }
}

// Export singleton instance
export const phantomWalletAdapter = new PhantomWalletAdapterImpl();

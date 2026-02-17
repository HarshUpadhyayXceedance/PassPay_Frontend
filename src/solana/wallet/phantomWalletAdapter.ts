import { Linking } from "react-native";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Buffer } from "buffer";

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

const MWA_IDENTITY = {
  name: "PassPay",
  uri: "https://passpay.app",
  icon: "favicon.ico",
};

/**
 * Phantom Wallet Adapter using Solana Mobile Wallet Adapter (MWA)
 *
 * Connects directly to Phantom wallet on the device.
 * Requires: `npx expo run:android` (dev client build, NOT Expo Go)
 * Requires: Phantom app installed on the same device/emulator
 */
class PhantomWalletAdapterImpl implements PhantomWalletAdapter {
  private _publicKey: PublicKey | null = null;
  private _authToken: string | null = null;

  private async getMWA() {
    const mwa = await import(
      "@solana-mobile/mobile-wallet-adapter-protocol-web3js"
    ) as any;
    return mwa.transact ?? mwa.default?.transact ?? mwa;
  }

  async connect(): Promise<PublicKey> {
    try {
      const transact = await this.getMWA();

      const authResult = await transact(async (wallet: any) => {
        const auth = await wallet.authorize({
          cluster: "devnet",
          identity: MWA_IDENTITY,
        });
        return auth;
      });

      if (!authResult?.accounts?.length) {
        throw new Error("No accounts returned. Please approve in Phantom.");
      }

      // MWA returns account address as base64-encoded bytes
      const account = authResult.accounts[0];
      const addressBytes = Buffer.from(account.address, "base64");
      this._publicKey = new PublicKey(addressBytes);
      this._authToken = authResult.auth_token ?? null;

      console.log("✅ Connected to Phantom:", this._publicKey.toBase58());
      return this._publicKey;
    } catch (error: any) {
      console.error("❌ Phantom connection failed:", error);

      if (
        error.message?.includes("No installed wallet") ||
        error.message?.includes("Found no installed")
      ) {
        await Linking.openURL("https://phantom.app/download");
        throw new Error(
          "Phantom wallet not found. Install Phantom and try again."
        );
      }

      // MWA native module missing → user is running in Expo Go
      if (
        error.message?.includes("native module") ||
        error.message?.includes("Cannot read") ||
        error.message?.includes("undefined is not") ||
        error.message?.includes("null is not an object")
      ) {
        throw new Error(
          "Phantom requires a dev client. Run: npx expo run:android"
        );
      }

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this._authToken) {
        const transact = await this.getMWA();
        await transact(async (wallet: any) => {
          await wallet.deauthorize({ auth_token: this._authToken });
        });
      }
    } catch (error) {
      console.warn("Disconnect warning:", error);
    } finally {
      this._publicKey = null;
      this._authToken = null;
      console.log("✅ Disconnected from Phantom");
    }
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this._publicKey) throw new Error("Wallet not connected");

    const transact = await this.getMWA();
    const signedTxs = await transact(async (wallet: any) => {
      await wallet.authorize({ cluster: "devnet", identity: MWA_IDENTITY });
      return await wallet.signTransactions({
        transactions: [transaction],
      });
    });

    return signedTxs[0];
  }

  async signAllTransactions(
    transactions: Transaction[]
  ): Promise<Transaction[]> {
    if (!this._publicKey) throw new Error("Wallet not connected");

    const transact = await this.getMWA();
    const signedTxs = await transact(async (wallet: any) => {
      await wallet.authorize({ cluster: "devnet", identity: MWA_IDENTITY });
      return await wallet.signTransactions({ transactions });
    });

    return signedTxs;
  }

  async signAndSendTransaction(
    transaction: Transaction
  ): Promise<{ signature: string }> {
    if (!this._publicKey) throw new Error("Wallet not connected");

    const transact = await this.getMWA();
    const signatures = await transact(async (wallet: any) => {
      await wallet.authorize({ cluster: "devnet", identity: MWA_IDENTITY });
      return await wallet.signAndSendTransactions({
        transactions: [transaction],
      });
    });

    const sig = signatures[0];
    console.log("✅ Transaction sent:", sig);
    return { signature: Buffer.from(sig).toString("base64") };
  }

  getPublicKey(): PublicKey | null {
    return this._publicKey;
  }
}

// Export singleton instance
export const phantomWalletAdapter = new PhantomWalletAdapterImpl();

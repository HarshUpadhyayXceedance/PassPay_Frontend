import { Alert, Linking } from "react-native";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";

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
  isDevMode: () => boolean;
}

const MWA_IDENTITY = {
  name: "PassPay",
  uri: "https://passpay.app",
  icon: "favicon.ico",
};

/** Check if we're running inside Expo Go (no native modules) */
function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

/** Validate a Solana base58 address */
function isValidSolanaAddress(str: string): boolean {
  try {
    const key = new PublicKey(str.trim());
    return PublicKey.isOnCurve(key.toBytes());
  } catch {
    return false;
  }
}

/**
 * Phantom Wallet Adapter using Solana Mobile Wallet Adapter (MWA)
 *
 * Connects directly to Phantom wallet on the device.
 * Requires: `npx expo run:android` (dev client build, NOT Expo Go)
 * Requires: Phantom app installed on the same device/emulator
 *
 * In Expo Go, falls back to clipboard-based connection (read-only).
 */
class PhantomWalletAdapterImpl implements PhantomWalletAdapter {
  private _publicKey: PublicKey | null = null;
  private _authToken: string | null = null;
  private _devMode: boolean = false;

  private async getMWA() {
    const mwa = await import(
      "@solana-mobile/mobile-wallet-adapter-protocol-web3js"
    ) as any;
    return mwa.transact ?? mwa.default?.transact ?? mwa;
  }

  isDevMode(): boolean {
    return this._devMode;
  }

  async connect(): Promise<PublicKey> {
    // In Expo Go, skip MWA entirely and use clipboard fallback
    if (isExpoGo()) {
      return this.connectViaClipboard();
    }

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
      this._devMode = false;

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

      // MWA native module missing — fallback to clipboard
      if (
        error.message?.includes("not a function") ||
        error.message?.includes("native module") ||
        error.message?.includes("Cannot read") ||
        error.message?.includes("undefined is not") ||
        error.message?.includes("null is not an object")
      ) {
        return this.connectViaClipboard();
      }

      throw error;
    }
  }

  /**
   * Clipboard-based fallback for Expo Go.
   * User copies their Phantom wallet address, then taps Connect.
   */
  private async connectViaClipboard(): Promise<PublicKey> {
    const clipText = await Clipboard.getStringAsync();

    if (clipText && isValidSolanaAddress(clipText)) {
      this._publicKey = new PublicKey(clipText.trim());
      this._devMode = true;
      console.log(
        "✅ Connected via clipboard (dev mode):",
        this._publicKey.toBase58()
      );
      Alert.alert(
        "Dev Mode",
        `Connected with address from clipboard:\n${this._publicKey.toBase58().slice(0, 8)}...\n\nRead-only mode — transactions require a development build.`
      );
      return this._publicKey;
    }

    throw new Error(
      "Expo Go detected — copy your Phantom wallet address to clipboard, then tap Connect again."
    );
  }

  async disconnect(): Promise<void> {
    try {
      if (this._authToken && !this._devMode) {
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
      this._devMode = false;
      console.log("✅ Disconnected from Phantom");
    }
  }

  /**
   * Reauthorize or authorize within a MWA session.
   * Uses saved auth_token for silent re-auth (avoids full "Connect" prompt).
   * Falls back to full authorize if reauthorize fails.
   */
  private async authorizeSession(wallet: any): Promise<void> {
    if (this._authToken) {
      try {
        const result = await wallet.reauthorize({
          auth_token: this._authToken,
          identity: MWA_IDENTITY,
        });
        this._authToken = result.auth_token ?? this._authToken;
        return;
      } catch {
        // reauthorize failed (token expired), fall back to full authorize
        console.warn("⚠️ Reauthorize failed, falling back to authorize");
      }
    }
    const result = await wallet.authorize({
      cluster: "devnet",
      identity: MWA_IDENTITY,
    });
    this._authToken = result.auth_token ?? null;
  }

  private throwIfDevMode(): void {
    if (this._devMode) {
      throw new Error(
        "Transactions are not available in Expo Go. Use a development build (eas build --profile development) to sign transactions."
      );
    }
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this._publicKey) throw new Error("Wallet not connected");
    this.throwIfDevMode();

    const transact = await this.getMWA();
    const signedTxs = await transact(async (wallet: any) => {
      await this.authorizeSession(wallet);
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
    this.throwIfDevMode();

    const transact = await this.getMWA();
    const signedTxs = await transact(async (wallet: any) => {
      await this.authorizeSession(wallet);
      return await wallet.signTransactions({ transactions });
    });

    return signedTxs;
  }

  async signAndSendTransaction(
    transaction: Transaction
  ): Promise<{ signature: string }> {
    if (!this._publicKey) throw new Error("Wallet not connected");
    this.throwIfDevMode();

    const transact = await this.getMWA();
    const signatures = await transact(async (wallet: any) => {
      await this.authorizeSession(wallet);
      return await wallet.signAndSendTransactions({
        transactions: [transaction],
      });
    });

    // MWA web3js wrapper returns base58 signature strings
    const signature = signatures[0];
    console.log("✅ Transaction sent:", signature);
    return { signature: String(signature) };
  }

  getPublicKey(): PublicKey | null {
    return this._publicKey;
  }
}

// Export singleton instance
export const phantomWalletAdapter = new PhantomWalletAdapterImpl();

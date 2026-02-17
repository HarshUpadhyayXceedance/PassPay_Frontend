import { PublicKey } from "@solana/web3.js";
import { createProvider } from "../../solana/wallet/walletSession";
import { phantomWalletAdapter } from "../../solana/wallet/phantomWalletAdapter";
import {
  registerMerchant,
  RegisterMerchantParams,
} from "../../solana/actions/registerMerchant";
import { activateMerchant } from "../../solana/actions/activateMerchant";
import { deactivateMerchant } from "../../solana/actions/deactivateMerchant";
import { payMerchant, PayMerchantParams } from "../../solana/actions/payMerchant";

export async function apiRegisterMerchant(params: {
  eventPda: string;
  merchantAuthority: string;
  name: string;
  description: string;
  imageUrl?: string;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return registerMerchant(provider, {
    eventPda: new PublicKey(params.eventPda),
    merchantAuthority: new PublicKey(params.merchantAuthority),
    name: params.name,
    description: params.description,
    imageUrl: params.imageUrl,
  });
}

export async function apiActivateMerchant(params: {
  eventPda: string;
  merchantAuthority: string;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return activateMerchant(provider, {
    eventPda: new PublicKey(params.eventPda),
    merchantAuthority: new PublicKey(params.merchantAuthority),
  });
}

export async function apiDeactivateMerchant(params: {
  eventPda: string;
  merchantAuthority: string;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return deactivateMerchant(provider, {
    eventPda: new PublicKey(params.eventPda),
    merchantAuthority: new PublicKey(params.merchantAuthority),
  });
}

export async function apiPayMerchant(params: {
  eventPda: string;
  merchantAuthority: string;
  amount: number;
}): Promise<string> {
  const wallet = phantomWalletAdapter;
  if (!wallet.getPublicKey()) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return payMerchant(provider, {
    eventPda: new PublicKey(params.eventPda),
    merchantAuthority: new PublicKey(params.merchantAuthority),
    amount: params.amount,
  });
}

import { PublicKey } from "@solana/web3.js";
import { createProvider } from "../../solana/wallet/walletSession";
import { getWalletAdapter } from "../../hooks/useWallet";
import {
  registerMerchant,
  RegisterMerchantParams,
} from "../../solana/actions/registerMerchant";
import { payMerchant, PayMerchantParams } from "../../solana/actions/payMerchant";

export async function apiRegisterMerchant(params: {
  eventPda: string;
  merchantAuthority: string;
  name: string;
}): Promise<string> {
  const wallet = getWalletAdapter();
  if (!wallet) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return registerMerchant(provider, {
    eventPda: new PublicKey(params.eventPda),
    merchantAuthority: new PublicKey(params.merchantAuthority),
    name: params.name,
  });
}

export async function apiPayMerchant(params: {
  eventPda: string;
  merchantAuthority: string;
  ticketMint: string;
  amount: number;
}): Promise<string> {
  const wallet = getWalletAdapter();
  if (!wallet) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return payMerchant(provider, {
    eventPda: new PublicKey(params.eventPda),
    merchantAuthority: new PublicKey(params.merchantAuthority),
    ticketMint: new PublicKey(params.ticketMint),
    amount: params.amount,
  });
}
